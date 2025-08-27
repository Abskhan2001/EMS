import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MoreVertical, Trash2, Check, CheckCheck, ChevronDown, ChevronUp, Image, Smile, X, Info, Edit2, UserPlus, UserMinus, Settings, Users } from 'lucide-react';
import { useUserContext } from '../lib/userprovider';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';
import ConfirmationAlert from './confirmdelete';
import {
    getGroupDetails,
    getGroupMembers,
    getGroupMessages,
    sendGroupMessage,
    addGroupMember,
    removeGroupMember,
    deleteGroupMessage,
    editGroupMessage,
    markGroupMessagesAsSeen,
    getMessageSeenStatus
} from './chatlib/groupchatfunc';

interface GroupMessage {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    group_id: string;
    message_type: string;
    sender?: {
        id: string;
        full_name: string;
        profile_image?: string;
        role: string;
    };
    seenStatus?: {
        seenCount: number;
        totalMembers: number;
        seenBy: Array<{
            userId: string;
            userName: string;
            seenAt: string;
        }>;
    };
}

interface GroupMember {
    id: string;
    user_id: string;
    role: string;
    joined_at: string;
    users?: {
        id: string;
        full_name: string;
        profile_image?: string;
        role: string;
    };
}

interface Group {
    id: string;
    name: string;
    description?: string;
    group_image?: string;
    created_by: string;
    created_at: string;
}

const GroupChat = ({ groupId, closegroupchat }: { groupId: string, closegroupchat: () => void }) => {
    const { chatUsers } = useUserContext();
    const { userProfile: currentUser } = useUser();

    // Debug current user
    useEffect(() => {
        console.log('GroupChat - Current User from useUser:', currentUser);
        if (currentUser) {
            console.log('Current User ID:', currentUser.id);
            console.log('Current User Full Name:', currentUser.full_name);
            console.log('Current User Role:', currentUser.role);
        }
    }, [currentUser]);

    const [group, setGroup] = useState<Group | null>(null);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [messages, setMessages] = useState<GroupMessage[]>([]);
    const [messageText, setMessageText] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [messageSeenStatus, setMessageSeenStatus] = useState<Record<string, any>>({});
    const [showSeenModal, setShowSeenModal] = useState<string | null>(null);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const groupInfoRef = useRef<HTMLDivElement>(null);
    const editInputRef = useRef<HTMLTextAreaElement>(null);

    // Check if current user is group admin
    const isGroupAdmin = members.find(m => m.user_id === currentUser?.id)?.role === 'admin' || group?.created_by === currentUser?.id;

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load group data
    const loadGroupData = async () => {
        if (!groupId || !currentUser?.id) {
            console.log('Missing groupId or currentUser:', { groupId, currentUserId: currentUser?.id });
            return;
        }

        try {
            setInitialLoading(true);
            console.log('Loading group data for groupId:', groupId);

            // Fetch group details
            const groupData = await getGroupDetails(groupId);
            console.log('Group data:', groupData);
            setGroup(groupData);

            // Fetch group members
            const membersData = await getGroupMembers(groupId);
            console.log('Members data:', membersData);
            setMembers(membersData);

            // Fetch group messages
            const messagesData = await getGroupMessages(groupId);
            console.log('Messages data:', messagesData);
            setMessages(messagesData);

            // Mark messages as seen when loading the chat
            await markGroupMessagesAsSeen(currentUser.id, groupId);

        } catch (error) {
            console.error('Error loading group data:', error);
        } finally {
            setInitialLoading(false);
        }
    };

    // Send group message
    const handleSendMessage = useCallback(async () => {
        if (!messageText.trim() || !currentUser?.id || !groupId) {
            console.log('Cannot send message - missing data:', {
                messageText: messageText.trim(),
                currentUserId: currentUser?.id,
                groupId
            });
            return;
        }

        try {
            setIsSending(true);
            console.log('Sending message with currentUser:', currentUser);
            console.log('Current user ID:', currentUser.id);

            const data = await sendGroupMessage(currentUser.id, groupId, messageText);
            setMessages(prev => [...prev, {
                ...data,
                sender: data.sender
            }]);
            setMessageText('');

        } catch (error) {
            console.error('Error sending message:', error);
            alert(`Failed to send message: ${error.message}`);
        } finally {
            setIsSending(false);
        }
    }, [messageText, currentUser?.id, groupId]);

    // Delete message
    const handleDeleteMessage = async (messageId: string) => {
        try {
            setIsVisible(true);
            setIsDeleting(true);

            await deleteGroupMessage(messageId);
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
        } catch (error) {
            console.error('Error deleting message:', error);
        } finally {
            setIsDeleting(false);
            setTimeout(() => setIsVisible(false), 700);
        }
    };

    // Edit message
    const handleStartEditing = (message: GroupMessage) => {
        setEditingMessageId(message.id);
        setEditingText(message.content);
    };

    const handleSaveEdit = async () => {
        if (!editingMessageId || !editingText.trim()) return;

        try {
            const data = await editGroupMessage(editingMessageId, editingText);
            setMessages(prev => prev.map(msg => msg.id === editingMessageId ? data : msg));
            setEditingMessageId(null);
            setEditingText('');
        } catch (error) {
            console.error('Error updating message:', error);
        }
    };

    // Add member to group
    const handleAddMember = async (userId: string) => {
        try {
            await addGroupMember(groupId, userId);
            loadGroupData(); // Refresh data
        } catch (error) {
            console.error('Error adding member:', error);
        }
    };

    // Remove member from group
    const handleRemoveMember = async (userId: string) => {
        try {
            await removeGroupMember(groupId, userId);
            loadGroupData(); // Refresh data
        } catch (error) {
            console.error('Error removing member:', error);
        }
    };

    // Format message time
    const formatMessageTime = (timestamp: string) => {
        const now = new Date();
        const messageDate = new Date(timestamp);
        const hours = messageDate.getHours().toString().padStart(2, '0');
        const minutes = messageDate.getMinutes().toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}`;

        if (messageDate.toDateString() !== now.toDateString()) {
            const day = messageDate.getDate().toString().padStart(2, '0');
            const month = (messageDate.getMonth() + 1).toString().padStart(2, '0');
            return `${day}/${month} ${timeString}`;
        }
        return timeString;
    };

    // Load seen status for a message
    const loadSeenStatus = async (messageId: string) => {
        if (!groupId) return;

        try {
            const status = await getMessageSeenStatus(messageId, groupId);
            setMessageSeenStatus(prev => ({
                ...prev,
                [messageId]: status
            }));
        } catch (error) {
            console.error('Error loading seen status:', error);
        }
    };

    // Handle seen status click
    const handleSeenStatusClick = async (messageId: string) => {
        await loadSeenStatus(messageId);
        setShowSeenModal(messageId);
    };

    // Render seen status icon
    const renderSeenStatusIcon = (message: GroupMessage) => {
        if (message.sender_id !== currentUser?.id) return null; // Only show to sender

        const status = messageSeenStatus[message.id];
        const totalMembers = members.length - 1; // Exclude sender

        if (!status) {
            // Load status on first render
            loadSeenStatus(message.id);
            return (
                <div className="flex items-center ml-2">
                    <Check className="w-3 h-3 text-gray-400" />
                </div>
            );
        }

        const seenCount = status.seenCount || 0;
        const isAllSeen = seenCount === totalMembers;

        return (
            <div
                className="flex items-center ml-2 cursor-pointer hover:bg-gray-700 rounded px-1 py-0.5 transition-colors"
                onClick={() => handleSeenStatusClick(message.id)}
                title={`${seenCount}/${totalMembers} seen`}
            >
                {isAllSeen ? (
                    <CheckCheck className="w-3 h-3 text-blue-400" />
                ) : seenCount > 0 ? (
                    <CheckCheck className="w-3 h-3 text-gray-400" />
                ) : (
                    <Check className="w-3 h-3 text-gray-400" />
                )}
                <span className="text-xs text-gray-400 ml-1">{seenCount}/{totalMembers}</span>
            </div>
        );
    };

    // Group messages by date
    const groupMessagesByDate = () => {
        const groups: { [key: string]: GroupMessage[] } = {};
        messages.forEach(msg => {
            const date = new Date(msg.created_at);
            const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(msg);
        });
        return groups;
    };

    const getDayLabel = (dateKey: string) => {
        const [year, month, day] = dateKey.split('-').map(Number);
        const date = new Date(year, month, day);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'TODAY';
        if (date.toDateString() === yesterday.toDateString()) return 'YESTERDAY';

        const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options).toUpperCase();
    };

    // Load seen status for all messages
    const loadAllSeenStatuses = async () => {
        if (!groupId || messages.length === 0) return;

        try {
            const statusPromises = messages.map(async (message) => {
                const status = await getMessageSeenStatus(message.id, groupId);
                return { messageId: message.id, status };
            });

            const statuses = await Promise.all(statusPromises);
            const statusMap = statuses.reduce((acc, { messageId, status }) => {
                acc[messageId] = status;
                return acc;
            }, {} as Record<string, any>);

            setMessageSeenStatus(statusMap);
        } catch (error) {
            console.error('Error loading all seen statuses:', error);
        }
    };

    // Load data on mount
    useEffect(() => {
        loadGroupData();
    }, [groupId, currentUser?.id]);

    // Load seen statuses when messages change
    useEffect(() => {
        if (messages.length > 0) {
            loadAllSeenStatuses();
        }
    }, [messages, groupId]);

    // Real-time subscriptions (COMMENTED OUT)
    useEffect(() => {
        if (!groupId || !currentUser?.id) return;

        // const messagesChannel = supabase
        //     .channel(`group-messages-${groupId}`)
        //     .on('postgres_changes', {
        //         event: '*',
        //         schema: 'public',
        //         table: 'messages',
        //         filter: `group_id=eq.${groupId}`
        //     }, async (payload: any) => {
        //         if (payload.eventType === 'INSERT' && payload.new.sender_id !== currentUser.id) {
        //             // Fetch the complete message with sender info
        //             try {
        //                 const { data: messageData } = await supabase
        //                     .from('messages')
        //                     .select('*')
        //                     .eq('id', payload.new.id)
        //                     .single();

        //                 if (messageData) {
        //                     const { data: senderData } = await supabase
        //                         .from('users')
        //                         .select('id, full_name, profile_image, role')
        //                         .eq('id', messageData.sender_id)
        //                         .single();

        //                     const messageWithSender = {
        //                         ...messageData,
        //                         sender: senderData
        //                     };

        //                     setMessages(prev => [...prev, messageWithSender]);

        //                     // Automatically mark the new message as seen
        //                     await markGroupMessagesAsSeen(currentUser.id, groupId);
        //                 }
        //             } catch (error) {
        //                 console.error('Error fetching new message:', error);
        //             }
        //         }
        //         if (payload.eventType === 'DELETE') {
        //             setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
        //         }
        //         if (payload.eventType === 'UPDATE' && payload.new.sender_id !== currentUser.id) {
        //             setMessages(prev => prev.map(msg => msg.id === payload.new.id ? {
        //                 ...payload.new,
        //                 sender: msg.sender
        //             } : msg));
        //         }
        //     })
        //     .subscribe();

        // return () => {
        //     supabase.removeChannel(messagesChannel);
        // };
    }, [groupId, currentUser?.id]);

    // Auto-mark messages as seen when chat is visible and not minimized
    useEffect(() => {
        if (!groupId || !currentUser?.id || isMinimized || messages.length === 0) return;

        const markAsSeen = async () => {
            try {
                await markGroupMessagesAsSeen(currentUser.id, groupId);
            } catch (error) {
                console.error('Error auto-marking messages as seen:', error);
            }
        };

        // Mark as seen when chat becomes visible
        markAsSeen();
    }, [groupId, currentUser?.id, isMinimized, messages.length]);

    if (!group) {
        return (
            <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50">
                <div className="flex justify-center items-center h-full text-gray-400 bg-black p-4 rounded-t-lg shadow-xl border border-gray-700">
                    <p className='text-xl'>Group not found</p>
                </div>
            </div>
        );
    }

    const messageGroups = groupMessagesByDate();

    return (
        <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50">
            <div
                className={`flex flex-col ${isMinimized ? 'h-16' : 'h-[80vh]'} bg-black shadow-xl rounded-t-lg border border-gray-700 transition-all duration-300`}
                style={{ maxWidth: '750px', width: '90vw' }}
            >
                {/* Group Chat Header */}
                <div className="bg-black p-3 flex items-center justify-between border-b border-gray-700 shadow-sm rounded-t-lg">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                {group.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
                        </div>
                        <div
                            className="flex flex-col cursor-pointer hover:text-blue-400 transition-colors"
                            onClick={() => setShowGroupInfo(!showGroupInfo)}
                        >
                            <h2 className="font-medium text-white">{group.name}</h2>
                            <span className="text-xs text-gray-400">{members.length} members</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {isGroupAdmin && (
                            <button
                                className="text-gray-400 p-1.5 rounded-full hover:bg-gray-800 transition-colors"
                                onClick={() => setShowMemberModal(true)}
                            >
                                <UserPlus size={18} />
                            </button>
                        )}
                        <button className="text-gray-400 p-1.5 rounded-full hover:bg-gray-800 transition-colors">
                            <Users size={18} />
                        </button>
                        <button
                            className="text-gray-400 p-1.5 rounded-full hover:bg-gray-800 transition-colors"
                            onClick={() => setShowGroupInfo(!showGroupInfo)}
                        >
                            <Info size={18} />
                        </button>
                        <button
                            className="text-gray-400 p-1.5 rounded-full hover:bg-gray-800 transition-colors"
                            onClick={() => setIsMinimized(!isMinimized)}
                        >
                            {isMinimized ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        <button
                            className="text-gray-400 p-1.5 rounded-full hover:bg-gray-800 transition-colors ml-1"
                            onClick={closegroupchat}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Group Info Panel */}
                    {showGroupInfo && (
                        <div
                            ref={groupInfoRef}
                            className="absolute top-16 right-4 z-50 bg-gray-900 rounded-lg shadow-xl border border-gray-700 w-80 transition-all duration-200"
                        >
                            <div className="p-4">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                                        {group.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg text-white">{group.name}</h3>
                                        <p className="text-sm text-gray-400">{members.length} members</p>
                                    </div>
                                </div>

                                {group.description && (
                                    <p className="text-sm text-gray-300 mb-4">{group.description}</p>
                                )}

                                <div className="border-t border-gray-700 pt-4">
                                    <h4 className="font-medium text-white mb-3">Members</h4>
                                    <div className="max-h-48 overflow-y-auto space-y-2">
                                        {members.map((member) => (
                                            <div key={member.id} className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <img
                                                        src={(() => {
                                                            if (member.users?.profile_image) {
                                                                const { data: { publicUrl } } = supabase
                                                                    .storage
                                                                    .from("profilepics")
                                                                    .getPublicUrl(member.users.profile_image);
                                                                return publicUrl;
                                                            }
                                                            return member.users?.role === "admin" ? "./admin.jpeg" : "./profile.png";
                                                        })()}
                                                        className="w-8 h-8 rounded-full object-cover"
                                                        alt={member.users?.full_name}
                                                    />
                                                    <div>
                                                        <p className="text-sm text-white">{member.users?.full_name}</p>
                                                        <p className="text-xs text-gray-400 capitalize">{member.role}</p>
                                                    </div>
                                                </div>
                                                {isGroupAdmin && member.user_id !== currentUser?.id && (
                                                    <button
                                                        onClick={() => handleRemoveMember(member.user_id)}
                                                        className="text-red-400 hover:text-red-300 p-1"
                                                    >
                                                        <UserMinus size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Chat Messages */}
                {!isMinimized && (
                    <div
                        ref={chatContainerRef}
                        className="flex-grow overflow-y-auto bg-black px-4 py-2"
                    >
                        {initialLoading ? (
                            <div className="flex justify-center items-center h-full">
                                <p className="text-gray-400">Loading messages...</p>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex justify-center items-center h-full text-gray-400">
                                <p>No messages yet. Start the conversation!</p>
                            </div>
                        ) : (
                            Object.keys(messageGroups).sort().map(dateKey => (
                                <div key={dateKey} className="mb-4">
                                    <div className="flex justify-center my-4">
                                        <div className="text-xs text-gray-300 bg-gray-800 px-3 py-1 rounded-full">
                                            {getDayLabel(dateKey)}
                                        </div>
                                    </div>
                                    {messageGroups[dateKey].map(msg => (
                                        <div key={msg.id} className="mb-3">
                                            {msg.sender_id !== currentUser?.id ? (
                                                <div className="flex items-start mb-1 group">
                                                    <img
                                                        src={(() => {
                                                            if (msg.sender?.profile_image) {
                                                                const { data: { publicUrl } } = supabase
                                                                    .storage
                                                                    .from("profilepics")
                                                                    .getPublicUrl(msg.sender.profile_image);
                                                                return publicUrl;
                                                            }
                                                            return msg.sender?.role === "admin" ? "./admin.jpeg" : "./profile.png";
                                                        })()}
                                                        className="w-8 h-8 rounded-full mr-2 object-cover"
                                                        alt="Profile"
                                                    />
                                                    <div>
                                                        <div className="flex items-center mb-0.5">
                                                            <span className="font-medium text-white text-sm mr-2">
                                                                {msg.sender?.full_name}
                                                            </span>
                                                            <span className="text-xs text-gray-400">{formatMessageTime(msg.created_at)}</span>
                                                        </div>
                                                        <div className="bg-gray-800 rounded-xl rounded-tl-none px-3 py-2 text-white max-w-xs sm:max-w-md">
                                                            {msg.content}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end">
                                                    <div className="flex flex-col items-end max-w-xs sm:max-w-md">
                                                        <div className="flex items-center mb-0.5 justify-end">
                                                            <span className="text-xs text-gray-400 mr-1">{formatMessageTime(msg.created_at)}</span>
                                                        </div>
                                                        <div className="flex group relative">
                                                            {editingMessageId === msg.id ? (
                                                                <div className="bg-gray-800 border border-gray-600 rounded-xl p-1 min-w-[200px]">
                                                                    <textarea
                                                                        ref={editInputRef}
                                                                        value={editingText}
                                                                        onChange={(e) => setEditingText(e.target.value)}
                                                                        className="w-full p-2 outline-none text-white resize-none bg-transparent rounded-lg"
                                                                        rows={2}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                                e.preventDefault();
                                                                                handleSaveEdit();
                                                                            } else if (e.key === 'Escape') {
                                                                                setEditingMessageId(null);
                                                                                setEditingText('');
                                                                            }
                                                                        }}
                                                                    />
                                                                    <div className="flex justify-end space-x-2 mt-1 px-2 pb-1">
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingMessageId(null);
                                                                                setEditingText('');
                                                                            }}
                                                                            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                        <button
                                                                            onClick={handleSaveEdit}
                                                                            disabled={!editingText.trim()}
                                                                            className={`px-2 py-1 text-xs rounded ${editingText.trim()
                                                                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                                                                }`}
                                                                        >
                                                                            Save
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="absolute right-full mr-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1 bg-black/80 p-0.5 rounded-lg shadow-sm">
                                                                        <button
                                                                            onClick={() => handleStartEditing(msg)}
                                                                            className="p-1.5 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                                                                        >
                                                                            <Edit2 className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteMessage(msg.id)}
                                                                            className="p-1.5 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                    <div className="bg-blue-600 text-white rounded-xl rounded-tr-none px-3 py-2 hover:bg-blue-700 transition-colors">
                                                                        {msg.content}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                        {/* Seen Status Icon - Only visible to sender */}
                                                        {renderSeenStatusIcon(msg)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>
                )}

                <ConfirmationAlert isDeleting={isDeleting} isVisible={isVisible} />

                {/* Message Input */}
                {!isMinimized && (
                    <div className="bg-black p-2 border-t border-gray-700 mt-auto">
                        <div className="rounded-lg border border-gray-600 bg-gray-900">
                            <textarea
                                placeholder="Write a message..."
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                className="w-full p-3 outline-none text-white placeholder-gray-400 resize-none min-h-[40px] max-h-32 text-sm bg-transparent"
                                rows={1}
                            />
                            <div className="flex justify-between items-center p-2 border-t border-gray-700">
                                <div className="flex space-x-1">
                                    <button className="p-1.5 rounded-full hover:bg-gray-800 transition-colors">
                                        <Image className="w-5 h-5 text-gray-400" />
                                    </button>
                                    <div className="relative">
                                        <button
                                            className="p-1.5 rounded-full hover:bg-gray-800 transition-colors"
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        >
                                            <Smile className="w-5 h-5 text-gray-400" />
                                        </button>
                                        {showEmojiPicker && (
                                            <div className="absolute bottom-full mb-2 bg-gray-800 rounded-lg shadow-lg border border-gray-600 p-2 w-64 grid grid-cols-7 gap-1">
                                                {['😀', '😂', '😊', '🥰', '😍', '🤔', '😎', '👍', '👏', '❤️', '🎉', '🔥', '💯', '🙏'].map((emoji) => (
                                                    <button
                                                        key={emoji}
                                                        className="text-xl hover:bg-gray-700 p-1 rounded"
                                                        onClick={() => {
                                                            setMessageText(prev => prev + emoji);
                                                            setShowEmojiPicker(false);
                                                        }}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!messageText.trim() || isSending}
                                    className={`px-4 py-1.5 rounded-full text-sm font-medium ${messageText.trim() && !isSending
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        } transition-colors`}
                                >
                                    {isSending ? 'Sending...' : 'Send'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Member Modal */}
                {showMemberModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-gray-900 rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
                            <h3 className="text-lg font-semibold text-white mb-4">Add Members</h3>
                            <div className="space-y-2">
                                {chatUsers
                                    .filter(user => !members.some(m => m.user_id === user.id) && user.id !== currentUser?.id)
                                    .map(user => (
                                        <div key={user.id} className="flex items-center justify-between p-2 hover:bg-gray-800 rounded">
                                            <div className="flex items-center space-x-2">
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
                                                    className="w-8 h-8 rounded-full object-cover"
                                                    alt={user.full_name}
                                                />
                                                <span className="text-white">{user.full_name}</span>
                                            </div>
                                            <button
                                                onClick={() => handleAddMember(user.id)}
                                                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    ))}
                            </div>
                            <div className="flex justify-end mt-4">
                                <button
                                    onClick={() => setShowMemberModal(false)}
                                    className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Seen Status Modal */}
            {showSeenModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-900 rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Message Status</h3>
                            <button
                                onClick={() => setShowSeenModal(null)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {(() => {
                            const status = messageSeenStatus[showSeenModal];
                            if (!status) return <p className="text-gray-400">Loading...</p>;

                            const seenMembers = status.seenBy || [];
                            const unseenMembers = members.filter(member =>
                                member.user_id !== currentUser?.id &&
                                !seenMembers.some(seen => seen.userId === member.user_id)
                            );

                            return (
                                <div className="space-y-4">
                                    {/* Seen by */}
                                    {seenMembers.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center">
                                                <CheckCheck className="w-4 h-4 mr-1" />
                                                Seen by ({seenMembers.length})
                                            </h4>
                                            <div className="space-y-2">
                                                {seenMembers.map((seenMember) => {
                                                    const member = members.find(m => m.user_id === seenMember.userId);
                                                    return (
                                                        <div key={seenMember.userId} className="flex items-center space-x-2 p-2 bg-gray-800 rounded">
                                                            <img
                                                                src={(() => {
                                                                    if (member?.users?.profile_image) {
                                                                        const { data: { publicUrl } } = supabase
                                                                            .storage
                                                                            .from("profilepics")
                                                                            .getPublicUrl(member.users.profile_image);
                                                                        return publicUrl;
                                                                    }
                                                                    return member?.users?.role === "admin" ? "./admin.jpeg" : "./profile.png";
                                                                })()}
                                                                className="w-8 h-8 rounded-full object-cover"
                                                                alt={member?.users?.full_name}
                                                            />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-white">{member?.users?.full_name}</p>
                                                                <p className="text-xs text-gray-400">
                                                                    {new Date(seenMember.seenAt).toLocaleString()}
                                                                </p>
                                                            </div>
                                                            <CheckCheck className="w-4 h-4 text-green-400" />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Not seen by */}
                                    {unseenMembers.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
                                                <Check className="w-4 h-4 mr-1" />
                                                Not seen by ({unseenMembers.length})
                                            </h4>
                                            <div className="space-y-2">
                                                {unseenMembers.map((member) => (
                                                    <div key={member.user_id} className="flex items-center space-x-2 p-2 bg-gray-800 rounded">
                                                        <img
                                                            src={(() => {
                                                                if (member.users?.profile_image) {
                                                                    const { data: { publicUrl } } = supabase
                                                                        .storage
                                                                        .from("profilepics")
                                                                        .getPublicUrl(member.users.profile_image);
                                                                    return publicUrl;
                                                                }
                                                                return member.users?.role === "admin" ? "./admin.jpeg" : "./profile.png";
                                                            })()}
                                                            className="w-8 h-8 rounded-full object-cover"
                                                            alt={member.users?.full_name}
                                                        />
                                                        <div className="flex-1">
                                                            <p className="text-sm text-white">{member.users?.full_name}</p>
                                                            <p className="text-xs text-gray-400">Not seen yet</p>
                                                        </div>
                                                        <Check className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {seenMembers.length === 0 && unseenMembers.length === 0 && (
                                        <p className="text-gray-400 text-center">No other members in this group</p>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupChat;