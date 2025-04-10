import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  User,
  MessageCircle,
  Search,
  MoreVertical,
  PinIcon,
  LayoutDashboard,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../lib/store";
import { useUserContext } from "../lib/userprovider";
import { getonecountmsg, getUnseenMessageCount } from "./chatlib/supabasefunc";
import { supabase } from "../lib/supabase"; // Import supabase client

// New component to display each chat user with message counter
interface ChatUserItemProps {
  chatUser: any;
  currentUser: any;
  onMessageCountChange: (userId: string, count: number) => void;
}

const ChatUserItem: React.FC<ChatUserItemProps> = ({
  chatUser,
  currentUser,
  onMessageCountChange,
}) => {
  const [messageCount, setMessageCount] = useState(0);

  // Function to fetch message count - memoized to prevent recreating on each render
  const fetchMessageCount = useCallback(async () => {
    try {
      const count = await getonecountmsg(currentUser.id, chatUser.id);
      setMessageCount(count);
      // Notify parent component about the message count change
      onMessageCountChange(chatUser.id, count);
    } catch (error) {
      console.error("Error fetching message count:", error);
      setMessageCount(0);
      onMessageCountChange(chatUser.id, 0);
    }
  }, [currentUser.id, chatUser.id, onMessageCountChange]);

  // Handler for new messages - memoized to prevent recreating on each render
  const handleNewMessage = useCallback(
    (payload: any) => {
      if (!payload.new.seen) {
        setMessageCount((prevCount) => {
          const newCount = prevCount + 1;
          onMessageCountChange(chatUser.id, newCount);
          return newCount;
        });
      }
    },
    [chatUser.id, onMessageCountChange]
  );

  // Handler for message updates - memoized to prevent recreating on each render
  const handleMessageUpdate = useCallback(
    (payload: any) => {
      if (payload.new.seen !== payload.old.seen) {
        fetchMessageCount();
      }
    },
    [fetchMessageCount]
  );

  useEffect(() => {
    // Initial fetch of message count
    fetchMessageCount();

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel(`message-count-${currentUser.id}-${chatUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `reciever_id=eq.${currentUser.id} AND sender_id=eq.${chatUser.id}`,
        },
        handleNewMessage
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `reciever_id=eq.${currentUser.id} AND sender_id=eq.${chatUser.id}`,
        },
        handleMessageUpdate
      )
      .subscribe();

    // Clean up subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    currentUser.id,
    chatUser.id,
    fetchMessageCount,
    handleNewMessage,
    handleMessageUpdate,
  ]);

  return (
    <Link to={`/chat/${chatUser.id}`}>
      <div className="flex items-center p-4 hover:bg-gray-900 cursor-pointer transition-colors duration-200 relative">
        {/* If the user is an admin, display the pin icon */}
        {chatUser.role === "admin" && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
            <PinIcon className="w-4 h-4" fill="white" />
          </div>
        )}

        <div className="relative mr-4">
          <img
            src={chatUser.role === "admin" ? "./admin.jpeg" : "./profile.png"}
            alt={chatUser.full_name}
            className="w-12 h-12 rounded-full object-cover"
          />
          {/* Message counter badge positioned on the user's profile image */}
          {messageCount > 0 && (
            <div className="absolute -top-1 -right-1">
              <div className="flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-white">
                {messageCount > 99 ? "99+" : messageCount}
              </div>
            </div>
          )}
        </div>
        <div className="flex-grow">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-white flex items-center">
              {chatUser.full_name}
              {chatUser.role === "admin" && (
                <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                  Admin
                </span>
              )}
            </h3>
          </div>
          <p className="text-xs text-gray-400 truncate">Tap to chat</p>
        </div>
        <MoreVertical className="w-5 h-5 text-gray-500 ml-2" />
      </div>
    </Link>
  );
};

// Use React.memo to prevent unnecessary re-renders of ChatUserItem
const MemoizedChatUserItem = React.memo(ChatUserItem);

const ChatSidebar = () => {
  const { chatUsers } = useUserContext();
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const currentUser = useAuthStore((state) => state.user);
  const [totalUnseenCount, setTotalUnseenCount] = useState(0);
  // Track message counts for each user to use in sorting
  const [userMessageCounts, setUserMessageCounts] = useState<
    Record<string, number>
  >({});

  // Open sidebar on mount
  useEffect(() => {
    setIsOpen(true);
  }, []);

  // Fetch total unseen message count
  const fetchTotalCount = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      const count = await getUnseenMessageCount(currentUser.id);
      setTotalUnseenCount(count);
    } catch (error) {
      console.error("Error fetching total unseen count:", error);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;

    fetchTotalCount();

    // Set up real-time subscription for all new messages
    const channel = supabase
      .channel(`total-messages-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `reciever_id=eq.${currentUser.id}`,
        },
        fetchTotalCount
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, fetchTotalCount]);

  // Callback function to update message counts for a specific user
  const handleMessageCountChange = useCallback(
    (userId: string, count: number) => {
      setUserMessageCounts((prev) => {
        // Only update if the count has actually changed
        if (prev[userId] === count) return prev;
        return {
          ...prev,
          [userId]: count,
        };
      });
    },
    []
  );

  // Memoize filteredChatUsers to avoid unnecessary recalculations
  const filteredChatUsers = useMemo(() => {
    return chatUsers.filter((chatUser) => chatUser.id !== currentUser?.id);
  }, [chatUsers, currentUser?.id]);

  // Update filtered users when search term changes
  useEffect(() => {
    if (searchTerm) {
      setFilteredUsers(
        filteredChatUsers.filter((chatUser) =>
          chatUser.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredUsers(filteredChatUsers);
    }
  }, [searchTerm, filteredChatUsers]);

  // Enhanced sorting function that prioritizes:
  // 1. Admins first
  // 2. Users with unread messages second
  // 3. All other users alphabetically
  const sortUsers = useCallback(
    (users: any[]) => {
      return [...users].sort((a, b) => {
        // First priority: Admins
        if (a.role === "admin" && b.role !== "admin") return -1;
        if (b.role === "admin" && a.role !== "admin") return 1;

        // Second priority: Users with unread messages
        const aHasMessages = (userMessageCounts[a.id] || 0) > 0;
        const bHasMessages = (userMessageCounts[b.id] || 0) > 0;

        if (aHasMessages && !bHasMessages) return -1;
        if (!aHasMessages && bHasMessages) return 1;

        // If both have messages, sort by message count (higher first)
        if (aHasMessages && bHasMessages) {
          return (
            (userMessageCounts[b.id] || 0) - (userMessageCounts[a.id] || 0)
          );
        }

        // Last priority: Alphabetical order
        return a.full_name.localeCompare(b.full_name);
      });
    },
    [userMessageCounts]
  );

  // Memoize the sorted users to prevent unnecessary re-sorting
  const sortedUsers = useMemo(() => {
    const usersToSort = searchTerm === "" ? filteredChatUsers : filteredUsers;
    return sortUsers(usersToSort);
  }, [searchTerm, filteredChatUsers, filteredUsers, sortUsers]);

  // Check if current user is an admin
  const isAdmin = currentUser?.role === "admin";

  return (
    <div
      className={`fixed top-0 right-0 w-full max-w-xs bg-black border-r border-gray-800 h-screen flex flex-col transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="p-4 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <User className="w-6 h-6 text-white" />
          <h2 className="text-xl font-semibold text-white">Chats</h2>
        </div>
        <div className="flex items-center space-x-3">
          {/* Admin Dashboard Button - Only visible to admins */}
          {currentUser?.email === "techcreator@admin.com" && (
            <Link
              to="/admin"
              className="text-white hover:text-blue-400 transition-colors"
            >
              <div className="flex items-center space-x-1">
                <LayoutDashboard className="w-6 h-6" />
              </div>
            </Link>
          )}
          <div className="relative">
            <MessageCircle className="w-6 h-6 text-white" />
            {totalUnseenCount > 0 && (
              <div className="absolute -top-1 -right-1">
                <div className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {totalUnseenCount > 99 ? "99+" : totalUnseenCount}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-4 border-b border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search contacts"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* User List */}
      <div className="flex-grow overflow-y-auto divide-y divide-gray-800">
        {sortedUsers.length > 0 ? (
          sortedUsers.map((chatUser) => (
            <MemoizedChatUserItem
              key={chatUser.id}
              chatUser={chatUser}
              currentUser={currentUser}
              onMessageCountChange={handleMessageCountChange}
            />
          ))
        ) : (
          <div className="text-center py-4 text-gray-500">
            No contacts found
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
