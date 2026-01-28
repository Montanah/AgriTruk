import { apiRequest } from '../utils/api';

export interface JobPosting {
  id: string;
  title: string;
  description: string;
  fromLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  toLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  productType: string;
  weightKg: number;
  urgencyLevel: 'Low' | 'Medium' | 'High';
  perishable: boolean;
  needsRefrigeration: boolean;
  specialCargo: string[];
  insured: boolean;
  value?: number;
  estimatedCost: number;
  distance: number;
  estimatedDuration: string;
  pickUpDate: string;
  status: 'available' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  createdAt: string;
  updatedAt: string;
  requirements: {
    vehicleType: string[];
    minCapacity: number;
    refrigerated: boolean;
    specialEquipment: string[];
  };
  benefits: {
    priority: boolean;
    recurring: boolean;
    highValue: boolean;
  };
}

export interface JobFilter {
  location?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  vehicleType?: string[];
  minCapacity?: number;
  refrigerated?: boolean;
  urgencyLevel?: string[];
  status?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  maxDistance?: number;
}

export interface JobApplication {
  jobId: string;
  transporterId: string;
  proposedCost?: number;
  estimatedArrival?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  appliedAt: string;
}

class JobPostingService {
  private static instance: JobPostingService;
  private jobCache = new Map<string, JobPosting[]>();
  private lastFetch = new Map<string, number>();

  static getInstance(): JobPostingService {
    if (!JobPostingService.instance) {
      JobPostingService.instance = new JobPostingService();
    }
    return JobPostingService.instance;
  }

  /**
   * Get available jobs for transporters
   */
  async getAvailableJobs(filter?: JobFilter): Promise<JobPosting[]> {
    try {
      const cacheKey = this.getCacheKey(filter);
      const now = Date.now();
      
      // Check cache (5 minute TTL)
      if (this.jobCache.has(cacheKey) && this.lastFetch.get(cacheKey) && (now - this.lastFetch.get(cacheKey)!) < 300000) {
        return this.jobCache.get(cacheKey) || [];
      }

      const response = await apiRequest('/jobs/available', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filter || {}),
      });

      if (response.success) {
        const jobs = response.jobs || [];
        this.jobCache.set(cacheKey, jobs);
        this.lastFetch.set(cacheKey, now);
        return jobs;
      }
      
      return [];
    } catch (error) {
      console.error('Error getting available jobs:', error);
      return [];
    }
  }

  /**
   * Get job details
   */
  async getJobDetails(jobId: string): Promise<JobPosting | null> {
    try {
      const response = await apiRequest(`/jobs/${jobId}`, {
        method: 'GET',
      });

      if (response.success) {
        return response.job;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting job details:', error);
      return null;
    }
  }

  /**
   * Apply for a job
   */
  async applyForJob(jobId: string, application: Partial<JobApplication>): Promise<{ success: boolean; message: string; applicationId?: string }> {
    try {
      const response = await apiRequest(`/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...application,
          appliedAt: new Date().toISOString(),
        }),
      });

      if (response.success) {
        // Clear cache to force refresh
        this.clearCache();
      }

      return response;
    } catch (error) {
      console.error('Error applying for job:', error);
      throw error;
    }
  }

  /**
   * Withdraw job application
   */
  async withdrawApplication(jobId: string, applicationId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiRequest(`/jobs/${jobId}/applications/${applicationId}/withdraw`, {
        method: 'POST',
      });

      if (response.success) {
        // Clear cache to force refresh
        this.clearCache();
      }

      return response;
    } catch (error) {
      console.error('Error withdrawing application:', error);
      throw error;
    }
  }

  /**
   * Get my job applications
   */
  async getMyApplications(): Promise<JobApplication[]> {
    try {
      const response = await apiRequest('/jobs/my-applications', {
        method: 'GET',
      });

      if (response.success) {
        return response.applications || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting my applications:', error);
      return [];
    }
  }

  /**
   * Get my assigned jobs
   */
  async getMyAssignedJobs(): Promise<JobPosting[]> {
    try {
      const response = await apiRequest('/jobs/my-assigned', {
        method: 'GET',
      });

      if (response.success) {
        return response.jobs || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting my assigned jobs:', error);
      return [];
    }
  }

  /**
   * Update job status
   */
  async updateJobStatus(jobId: string, status: string, message?: string): Promise<boolean> {
    try {
      const response = await apiRequest(`/jobs/${jobId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, message }),
      });

      if (response.success) {
        // Clear cache to force refresh
        this.clearCache();
      }

      return response.success || false;
    } catch (error) {
      console.error('Error updating job status:', error);
      return false;
    }
  }

  /**
   * Get job statistics
   */
  async getJobStatistics(): Promise<{
    totalAvailable: number;
    totalApplied: number;
    totalAssigned: number;
    totalCompleted: number;
    averageEarnings: number;
    successRate: number;
  }> {
    try {
      const response = await apiRequest('/jobs/statistics', {
        method: 'GET',
      });

      if (response.success) {
        return response.statistics;
      }
      
      return {
        totalAvailable: 0,
        totalApplied: 0,
        totalAssigned: 0,
        totalCompleted: 0,
        averageEarnings: 0,
        successRate: 0,
      };
    } catch (error) {
      console.error('Error getting job statistics:', error);
      return {
        totalAvailable: 0,
        totalApplied: 0,
        totalAssigned: 0,
        totalCompleted: 0,
        averageEarnings: 0,
        successRate: 0,
      };
    }
  }

  /**
   * Search jobs by keywords
   */
  async searchJobs(query: string, filter?: JobFilter): Promise<JobPosting[]> {
    try {
      const response = await apiRequest('/jobs/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, filter }),
      });

      if (response.success) {
        return response.jobs || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error searching jobs:', error);
      return [];
    }
  }

  /**
   * Get nearby jobs
   */
  async getNearbyJobs(location: { latitude: number; longitude: number }, radius: number = 50): Promise<JobPosting[]> {
    try {
      const response = await apiRequest('/jobs/nearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location, radius }),
      });

      if (response.success) {
        return response.jobs || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting nearby jobs:', error);
      return [];
    }
  }

  /**
   * Get cache key for filter
   */
  private getCacheKey(filter?: JobFilter): string {
    if (!filter) return 'default';
    return JSON.stringify(filter);
  }

  /**
   * Clear all cache
   */
  private clearCache(): void {
    this.jobCache.clear();
    this.lastFetch.clear();
  }

  /**
   * Refresh cache
   */
  async refreshCache(filter?: JobFilter): Promise<JobPosting[]> {
    this.clearCache();
    return this.getAvailableJobs(filter);
  }
}

export default JobPostingService.getInstance();
