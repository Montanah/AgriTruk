import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import chatService from '../services/chatService';
import { Chat } from '../services/chatService';

const ChatListScreen: React.FC = () => {
  const navigation = useNavigation();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChats = async () => {
    try {
      const response = await chatService.getChats();
      if (response.success && response.data) {
        const chatsArray = Array.isArray(response.data) ? response.data : [response.data];
        setChats(chatsArray);
      } else {
        console.error('Failed to fetch chats:', response.message);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const loadChats = async () => {
    setLoading(true);
    await fetchChats();
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChats();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [])
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getChatTitle = (chat: Chat) => {
    // This should be determined based on current user
    // For now, we'll use participant2 as the other user
    return `Chat with ${chat.participant2Type}`;
  };

  const getChatSubtitle = (chat: Chat) => {
    if (chat.lastMessage) {
      return chat.lastMessage.message;
    }
    return 'No messages yet';
  };

  const handleChatPress = (chat: Chat) => {
    navigation.navigate('ChatScreen' as never, {
      chatId: chat.id,
      otherUserId: chat.participant2Id,
      otherUserType: chat.participant2Type,
      otherUserName: getChatTitle(chat),
    } as never);
  };

  const renderChat = ({ item }: { item: Chat }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => handleChatPress(item)}
    >
      <View style={styles.avatarContainer}>
        <Ionicons
          name="person-circle-outline"
          size={48}
          color="#007AFF"
        />
      </View>
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatTitle}>{getChatTitle(item)}</Text>
          <Text style={styles.chatTime}>
            {item.lastMessageTime ? formatTime(item.lastMessageTime) : ''}
          </Text>
        </View>
        <Text style={styles.chatSubtitle} numberOfLines={2}>
          {getChatSubtitle(item)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color="#CCCCCC" />
      <Text style={styles.emptyStateTitle}>No Chats</Text>
      <Text style={styles.emptyStateText}>
        Start a conversation with transporters or brokers to see your chats here.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Messages</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={chats}
        renderItem={renderChat}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={chats.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    marginRight: 12,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chatTime: {
    fontSize: 12,
    color: '#666',
  },
  chatSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
});

export default ChatListScreen;
