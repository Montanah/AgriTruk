const admin = require("../config/firebase");
const db = admin.firestore();

const Company = {
  async create(data) {
    const companyId = db.collection("company").doc().id;
    const company = {
      companyId,
      transporterId: data.transporterId,
      companyName: data.name,
      companyRegistration: data.registration,
      companyContact: data.contact || '',
      status: data.status || 'pending',
      rejectionReason: data.rejectionReason || null,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };
    await db.collection("company").doc(companyId).set(company);
    return company;
  },
  async get(companyId) {
    const doc = await db.collection("company").doc(companyId).get();
    if (!doc.exists) throw new Error('Company not found');
    return { companyId: doc.id, ...doc.data() };
  },
  async update(companyId, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    const docRef = db.collection("company").doc(companyId);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Company not found');
    const currentData = doc.data();
    await docRef.update({
        ...updated,
        auditLog: admin.firestore.FieldValue.arrayUnion({
            action: 'update',
            by: updates.updatedBy || 'unknown',
            timestamp: admin.firestore.Timestamp.now(),
            changes: updates
      })
    });
    return this.get(companyId);
  },
  async approve(companyId) {
    const updates = { status: 'approved', updatedAt: admin.firestore.Timestamp.now() };
    await db.collection("company").doc(companyId).update(updates);
    return this.get(companyId); 
  },
  async reject(companyId, reason) {
    const updates = {
      status: 'rejected',
      rejectionReason: reason || 'Not specified',
      updatedAt: admin.firestore.Timestamp.now()
    };
    await db.collection("company").doc(companyId).update(updates);
    return this.get(companyId); 
  },
  async getAllForTransporter(transporterId) {
    const snapshot = await db.collection("company")
      .where("transporterId", "==", transporterId)
      .get();
    return snapshot.empty ? [] : snapshot.docs.map(doc => ({ companyId: doc.id, ...doc.data() }));
  },
  async getAll() {
    const snapshot = await db.collection("company").get();
    return snapshot.docs.map(doc => ({ companyId: doc.id, ...doc.data() }));
  },
  async delete(companyId) {
    const updates = { isDeleted: true, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection("company").doc(companyId).update(updates);
    return { message: 'Company marked as deleted' };
  },
//   async delete(companyId) {
//     await db.collection("company").doc(companyId).delete();
//     return { message: 'Company deleted successfully' };
//   },
  async getByStatus(status) {
    const snapshot = await db.collection("company")
      .where("status", "==", status)
      .get();
    return snapshot.empty ? [] : snapshot.docs.map(doc => ({ companyId: doc.id, ...doc.data() }));
  },
  async getByTransporter(transporterId) {
    const snapshot = await db.collection("company")
      .where("transporterId", "==", transporterId)
      .get();
    return snapshot.empty ? [] : snapshot.docs.map(doc => ({ companyId: doc.id, ...doc.data() }));
  },
  async getByTransporterAndStatus(transporterId, status) {
    const snapshot = await db.collection("company")
      .where("transporterId", "==", transporterId)
      .where("status", "==", status)
      .get();
    return snapshot.empty ? [] : snapshot.docs.map(doc => ({ companyId: doc.id, ...doc.data() }));
  },
  async search({ page = 1, limit = 10, status, search }) {
    const startIndex = (page - 1) * limit;
    let queries = [];

    // Base query with status filter if provided
    let baseQuery = db.collection("company").orderBy("createdAt", "desc");
    if (status) {
      baseQuery = baseQuery.where("status", "==", status);
    }

    // Search across companyName and companyRegistration if search term is provided
    if (search) {
      const searchLower = search.toLowerCase();
      queries.push(
        baseQuery
          .where("companyName", ">=", searchLower)
          .where("companyName", "<=", searchLower + '\uf8ff')
          .get()
      );
      queries.push(
        baseQuery
          .where("companyRegistration", ">=", searchLower)
          .where("companyRegistration", "<=", searchLower + '\uf8ff')
          .get()
      );
    } else {
      queries.push(baseQuery.get());
    }

    // Execute all queries and merge results
    const snapshots = await Promise.all(queries);
    const allDocs = snapshots.flatMap(snapshot => snapshot.docs);
    const uniqueDocs = Array.from(new Map(allDocs.map(doc => [doc.id, doc])).values()); // Remove duplicates

    // Apply pagination
    const paginatedDocs = uniqueDocs.slice(startIndex, startIndex + limit);
    const companies = paginatedDocs.map(doc => ({ companyId: doc.id, ...doc.data() }));
    const total = await db.collection("company").count().get();

    return {
      companies,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total.data().count / limit),
      totalItems: total.data().count
    };
  },
};

module.exports = Company;