import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { motion } from "framer-motion";
import {
  User,
  Search,
  MoreVertical,
  PinIcon,
  LayoutDashboard,
  X,
  Users,
  Plus,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../lib/store";
import { useUserContext } from "../lib/userprovider";
import { useUser } from "../contexts/UserContext";
import {
  getonecountmsg,
  getUnseenMessageCount,
} from "./chatlib/supabasefunc";
import {
  getUserGroups,
  createGroup,
  getGroupUnseenMessageCount,
} from "./chatlib/groupchatfunc";
import { supabase } from "../lib/supabase";

interface ChatUserItemProps {
  chatUser: any;
  currentUser: any;
  onMessageCountChange: (userId: string, count: number) => void;
  openchatperson: (id: string) => void;
}

interface GroupItemProps {
  group: any;
  currentUser: any;
  onMessageCountChange: (groupId: string, count: number) => void;
  opengroup: (id: string) => void;
}

const ChatUserItem: React.FC<ChatUserItemProps> = ({
  chatUser,
  currentUser,
  onMessageCountChange,
  openchatperson
}) => {
  const [messageCount, setMessageCount] = useState(0);

  const fetchMessageCount = useCallback(async () => {
    try {
      const count = await getonecountmsg(currentUser.id, chatUser.id);
      setMessageCount(count);
      onMessageCountChange(chatUser.id, count);
    } catch (error) {
      console.error("Error fetching message count:", error);
      setMessageCount(0);
      onMessageCountChange(chatUser.id, 0);
    }
  }, [currentUser.id, chatUser.id, onMessageCountChange]);

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

  const handleMessageUpdate = useCallback(
    (payload: any) => {
      if (payload.new.seen !== payload.old.seen) {
        fetchMessageCount();
      }
    },
    [fetchMessageCount]
  );

  useEffect(() => {
    fetchMessageCount();

    // WEBSOCKET REALTIME SUBSCRIPTION COMMENTED OUT
    // const channel = supabase
    //   .channel(`message-count-${currentUser.id}-${chatUser.id}`)
    //   .on(
    //     "postgres_changes",
    //     {
    //       event: "INSERT",
    //       schema: "public",
    //       table: "messages",
    //       filter: `reciever_id=eq.${currentUser.id} AND sender_id=eq.${chatUser.id}`,
    //     },
    //     handleNewMessage
    //   )
    //   .on(
    //     "postgres_changes",
    //     {
    //       event: "UPDATE",
    //       schema: "public",
    //       table: "messages",
    //       filter: `reciever_id=eq.${currentUser.id} AND sender_id=eq.${chatUser.id}`,
    //     },
    //     handleMessageUpdate
    //   )
    //   .subscribe();

    // return () => {
    //   supabase.removeChannel(channel);
    // };
  }, [
    currentUser.id,
    chatUser.id,
    fetchMessageCount,
    handleNewMessage,
    handleMessageUpdate,
  ]);

  return (

    <div onClick={() => openchatperson(chatUser.id)} className="flex items-center p-4 hover:bg-gray-900 cursor-pointer transition-colors duration-200 relative">
      {chatUser.role === "admin" && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
          <PinIcon className="w-4 h-4" fill="white" />
        </div>
      )}
      <div className="relative mr-4">
        <img
          // Option 1: Inline approach
          src={(() => {
            if (chatUser.profile_image) {
              const { data: { publicUrl } } = supabase
                .storage
                .from("profilepics")
                .getPublicUrl(chatUser.profile_image);
              return publicUrl;
            }
            return chatUser.role === "admin" ? "./admin.jpeg" : "./profile.png";
          })()}
          alt={chatUser.full_name}
          className="w-12 h-12 rounded-full object-cover"
        />
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

  );
};

const GroupItem: React.FC<GroupItemProps> = ({
  group,
  currentUser,
  onMessageCountChange,
  opengroup
}) => {
  const [messageCount, setMessageCount] = useState(0);

  const fetchGroupMessageCount = useCallback(async () => {
    try {
      const count = await getGroupUnseenMessageCount(currentUser.id, group.id);
      setMessageCount(count);
      onMessageCountChange(group.id, count);
    } catch (error) {
      console.error("Error fetching group message count:", error);
      setMessageCount(0);
      onMessageCountChange(group.id, 0);
    }
  }, [currentUser.id, group.id, onMessageCountChange]);

  const handleNewGroupMessage = useCallback(
    (payload: any) => {
      // Check if this is a group message and not from current user
      if (payload.new.group_id === group.id && payload.new.sender_id !== currentUser.id) {
        fetchGroupMessageCount();
      }
    },
    [group.id, currentUser.id, fetchGroupMessageCount]
  );

  const handleGroupMessageStatusUpdate = useCallback(
    (payload: any) => {
      // When message status is updated, refetch count
      fetchGroupMessageCount();
    },
    [fetchGroupMessageCount]
  );

  useEffect(() => {
    fetchGroupMessageCount();

    // WEBSOCKET REALTIME SUBSCRIPTION COMMENTED OUT
    // const channel = supabase
    //   .channel(`group-message-count-${currentUser.id}-${group.id}`)
    //   .on(
    //     "postgres_changes",
    //     {
    //       event: "INSERT",
    //       schema: "public",
    //       table: "messages",
    //       filter: `group_id=eq.${group.id}`,
    //     },
    //     handleNewGroupMessage
    //   )
    //   .on(
    //     "postgres_changes",
    //     {
    //       event: "*",
    //       schema: "public",
    //       table: "group_message_status",
    //       filter: `user_id=eq.${currentUser.id}`,
    //     },
    //     handleGroupMessageStatusUpdate
    //   )
    //   .subscribe();

    // return () => {
    //   supabase.removeChannel(channel);
    // };
  }, [
    currentUser.id,
    group.id,
    fetchGroupMessageCount,
    handleNewGroupMessage,
    handleGroupMessageStatusUpdate,
  ]);

  return (
    <div onClick={() => opengroup(group.id)} className="flex items-center p-4 hover:bg-gray-900 cursor-pointer transition-colors duration-200 relative">
      <div className="relative mr-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          {group.group_image ? (
            <img
              src={(() => {
                const { data: { publicUrl } } = supabase
                  .storage
                  .from("groupimages")
                  .getPublicUrl(group.group_image);
                return publicUrl;
              })()}
              alt={group.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <Users className="w-6 h-6 text-white" />
          )}
        </div>
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
            {group.name}
            <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
              Group
            </span>
          </h3>
        </div>
        <p className="text-xs text-gray-400 truncate">
          {group.member_count} members • Tap to open
        </p>
      </div>
      <MoreVertical className="w-5 h-5 text-gray-500 ml-2" />
    </div>
  );
};

const CreateGroupModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  chatUsers: any[];
  onGroupCreated: () => void;
}> = ({ isOpen, onClose, currentUser, chatUsers, onGroupCreated }) => {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const modalRef = useRef<HTMLDivElement | null>(null);

  const filteredUsers = useMemo(() => {
    return chatUsers.filter((user) => 
      user.id !== currentUser?.id &&
      user.full_name.toLowerCase().includes(memberSearchTerm.toLowerCase())
    );
  }, [chatUsers, currentUser?.id, memberSearchTerm]);

  const handleMemberToggle = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert("Please enter a group name");
      return;
    }

    setIsCreating(true);
    try {
      await createGroup(
        groupName.trim(),
        groupDescription.trim(),
        currentUser.id,
        selectedMembers
      );
      
      // Reset form
      setGroupName("");
      setGroupDescription("");
      setSelectedMembers([]);
      setMemberSearchTerm("");
      
      // Refresh groups and close modal
      onGroupCreated();
      onClose();
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setGroupName("");
      setGroupDescription("");
      setSelectedMembers([]);
      setMemberSearchTerm("");
      onClose();
    }
  };

  // Handle click outside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, isCreating]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <motion.div
        ref={modalRef}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Create Group</h2>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Group Name *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCreating}
            />
          </div>

          {/* Group Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="Enter group description"
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={isCreating}
            />
          </div>

          {/* Member Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Add Members ({selectedMembers.length} selected)
            </label>
            
            {/* Search Members */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                placeholder="Search members"
                className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={isCreating}
              />
            </div>

            {/* Members List */}
            <div className="max-h-48 overflow-y-auto border border-gray-700 rounded-lg">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => !isCreating && handleMemberToggle(user.id)}
                    className={`flex items-center p-3 cursor-pointer transition-colors ${
                      selectedMembers.includes(user.id)
                        ? 'bg-blue-600 bg-opacity-20'
                        : 'hover:bg-gray-800'
                    } ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="relative mr-3">
                      <img
                        src={(() => {
                          if (user.profile_image) {
                            const { data: { publicUrl } } = supabase
                              .storage
                              .from("profilepics")
                              .getPublicUrl(user.profile_image);
                            return publicUrl;
                          }
                          return user.role === "admin" ? "./admin.jpeg" : "./profile.png";
                        })()}
                        alt={user.full_name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      {selectedMembers.includes(user.id) && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-sm font-medium text-white">
                        {user.full_name}
                        {user.role === "admin" && (
                          <span className="ml-2 text-xs bg-blue-500 text-white px-1 py-0.5 rounded">
                            Admin
                          </span>
                        )}
                      </h4>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-gray-500 text-sm">
                  No members found
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleClose}
              disabled={isCreating}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateGroup}
              disabled={isCreating || !groupName.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                'Create Group'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const MemoizedChatUserItem = React.memo(ChatUserItem);
const MemoizedGroupItem = React.memo(GroupItem);

const ChatSidebar = ({ closechat, openchatperson, opengroup }: { closechat: () => void, openchatperson: (id: string) => void, opengroup: (id: string) => void }) => {
  const { chatUsers } = useUserContext();
  const { userProfile: currentUser } = useUser();
  const navigate = useNavigate();
  console.log("the chat user is", chatUsers)
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalUnseenCount, setTotalUnseenCount] = useState(0);
  const [userMessageCounts, setUserMessageCounts] = useState<
    Record<string, number>
  >({});
  const [groupMessageCounts, setGroupMessageCounts] = useState<
    Record<string, number>
  >({});
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const sidebarRef = useRef<HTMLDivElement | null>(null); // <--- ref for click-outside

  // Check if current user is admin
  const isAdmin = currentUser?.role === 'admin';

  const fetchTotalCount = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const count = await getUnseenMessageCount(currentUser.id);
      setTotalUnseenCount(count);
    } catch (error) {
      console.error("Error fetching total unseen count:", error);
    }
  }, [currentUser?.id]);

  const fetchGroups = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const userGroups = await getUserGroups(currentUser.id);
      setGroups(userGroups);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchTotalCount();
    fetchGroups();

    // WEBSOCKET REALTIME SUBSCRIPTION COMMENTED OUT
    // const channel = supabase
    //   .channel(`total-messages-${currentUser.id}`)
    //   .on(
    //     "postgres_changes",
    //     {
    //       event: "*",
    //       schema: "public",
    //       table: "messages",
    //       filter: `reciever_id=eq.${currentUser.id}`,
    //     },
    //     fetchTotalCount
    //   )
    //   .subscribe();

    // return () => {
    //   supabase.removeChannel(channel);
    // };
  }, [currentUser?.id, fetchTotalCount, fetchGroups]);

  const handleMessageCountChange = useCallback(
    (userId: string, count: number) => {
      setUserMessageCounts((prev) => {
        if (prev[userId] === count) return prev;
        return {
          ...prev,
          [userId]: count,
        };
      });
    },
    []
  );

  const handleGroupMessageCountChange = useCallback(
    (groupId: string, count: number) => {
      setGroupMessageCounts((prev) => {
        if (prev[groupId] === count) return prev;
        return {
          ...prev,
          [groupId]: count,
        };
      });
    },
    []
  );

  const filteredChatUsers = useMemo(() => {
    return chatUsers.filter((chatUser) => chatUser.id !== currentUser?.id);
  }, [chatUsers, currentUser?.id]);

  useEffect(() => {
    if (searchTerm) {
      setFilteredUsers(
        filteredChatUsers.filter((chatUser) =>
          chatUser.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredGroups(
        groups.filter((group) =>
          group.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredUsers(filteredChatUsers);
      setFilteredGroups(groups);
    }
  }, [searchTerm, filteredChatUsers, groups]);

  const sortUsers = useCallback(
    (users: any[]) => {
      return [...users].sort((a, b) => {
        if (a.role === "admin" && b.role !== "admin") return -1;
        if (b.role === "admin" && a.role !== "admin") return 1;

        const aHasMessages = (userMessageCounts[a.id] || 0) > 0;
        const bHasMessages = (userMessageCounts[b.id] || 0) > 0;

        if (aHasMessages && !bHasMessages) return -1;
        if (!aHasMessages && bHasMessages) return 1;

        if (aHasMessages && bHasMessages) {
          return (
            (userMessageCounts[b.id] || 0) - (userMessageCounts[a.id] || 0)
          );
        }

        return a.full_name.localeCompare(b.full_name);
      });
    },
    [userMessageCounts]
  );

  const sortedUsers = useMemo(() => {
    const usersToSort = searchTerm === "" ? filteredChatUsers : filteredUsers;
    return sortUsers(usersToSort);
  }, [searchTerm, filteredChatUsers, filteredUsers, sortUsers]);

  // ✅ CLOSE ON CLICK OUTSIDE (but not when modal is open)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close sidebar if modal is open
      if (showCreateGroupModal) return;

      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        closechat();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [navigate, closechat, showCreateGroupModal]);

  return (
    <>
      <motion.div
        ref={sidebarRef}
        initial={{
          x: "calc(100% - 80px)", // Position at chat button location (16px margin + 64px button width)
          y: "calc(100vh - 7rem - 80px)", // Position at bottom where chat button is
          scale: 0,
          opacity: 0,
          transformOrigin: "bottom right"
        }}
        animate={{
          x: 0,
          y: 0,
          scale: 1,
          opacity: 1,
          transformOrigin: "bottom right"
        }}
        exit={{
          x: "calc(100% - 80px)",
          y: "calc(100vh - 7rem - 80px)",
          scale: 0,
          opacity: 0,
          transformOrigin: "bottom right"
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          opacity: { duration: 0.3 }
        }}
        className="fixed md:top-32 right-0 w-full max-w-xs bg-black border-l border-gray-800 md:h-[calc(100vh-8rem)] h-full flex flex-col z-50 overflow-hidden"
      >
      <div className="p-4 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <User className="w-6 h-6 text-white" />
          <h2 className="text-xl font-semibold text-white">Chats</h2>
        </div>
        <div className="flex items-center space-x-3">
          {/* Create Group Button - Only show for admins on groups tab */}
          {activeTab === 'groups' && isAdmin && (
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="text-blue-400 hover:text-blue-300 transition-colors"
              title="Create Group"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}

          <div className="relative">
            <button onClick={() => closechat()} >
              <X className="text-white hover:text-blue-400 transition-colors text-xl" />
            </button>

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

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'users'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-900'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <User className="w-4 h-4" />
            <span>Users</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'groups'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-900'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Groups</span>
          </div>
        </button>
      </div>

      <div className="p-4 border-b border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={activeTab === 'users' ? "Search contacts" : "Search groups"}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      <div className="flex-grow overflow-y-auto divide-y divide-gray-800">
        {activeTab === 'users' ? (
          sortedUsers.length > 0 ? (
            sortedUsers.map((chatUser) => (
              <MemoizedChatUserItem
                key={chatUser.id}
                chatUser={chatUser}
                currentUser={currentUser}
                onMessageCountChange={handleMessageCountChange}
                openchatperson={openchatperson}
              />
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              No contacts found
            </div>
          )
        ) : (
          filteredGroups.length > 0 ? (
            filteredGroups.map((group) => (
              <MemoizedGroupItem
                key={group.id}
                group={group}
                currentUser={currentUser}
                onMessageCountChange={handleGroupMessageCountChange}
                opengroup={(id: string) => {
                  console.log('Opening group:', id);
                  opengroup(id);
                }}
              />
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              <div className="mb-2">No groups found</div>
              {isAdmin ? (
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center justify-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Group</span>
                </button>
              ) : (
                <div className="text-xs text-gray-600">
                  Only admins can create groups
                </div>
              )}
            </div>
          )
        )}
      </div>
    </motion.div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        currentUser={currentUser}
        chatUsers={chatUsers}
        onGroupCreated={fetchGroups}
      />
    </>
  );
};

export default ChatSidebar;