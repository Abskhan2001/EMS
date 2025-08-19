import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1';

// Helper to get auth headers with valid token
const getAuthHeaders = async () => {
  const token = await authService.getValidToken();
  return token ? {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  } : { 'Content-Type': 'application/json' };
};

// Message service to replace Supabase chat functions
export const messageService = {
  // Fetch chat messages between two users
  async fetchChatMessages(currentUserId: string, targetUserId: string) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/messages/chat/${targetUserId}`, {
        headers
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch messages');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      throw error;
    }
  },

  // Send message
  async sendMessage(senderId: string, receiverId: string, content: string) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          receiverId,
          content
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send message');
      }

      return result.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Delete message
  async deleteMessage(messageId: string) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
        method: 'DELETE',
        headers
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete message');
      }

      return result;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  },

  // Mark messages as seen
  async markMessagesAsSeen(receiverId: string, senderId: string) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/messages/mark-seen`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          senderId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to mark messages as seen');
      }

      return result;
    } catch (error) {
      console.error('Error marking messages as seen:', error);
      throw error;
    }
  },

  // Get unseen message count
  async getUnseenMessageCount(userId?: string) {
    try {
      const headers = await getAuthHeaders();
      const url = userId
        ? `${API_BASE_URL}/messages/unseen-count/${userId}`
        : `${API_BASE_URL}/messages/unseen-count`;

      const response = await fetch(url, { headers });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get unseen message count');
      }

      return result.count;
    } catch (error) {
      console.error('Error getting unseen message count:', error);
      return 0;
    }
  },

  // Get one-to-one message count (for specific user)
  async getonecountmsg(currentUserId: string, targetUserId: string) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/messages/unseen-count/${targetUserId}`, {
        headers
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get message count');
      }

      return result.count;
    } catch (error) {
      console.error('Error getting message count:', error);
      return 0;
    }
  },

  // Edit message
  async editMessage(messageId: string, content: string) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ content })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to edit message');
      }

      return result.data;
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }
};