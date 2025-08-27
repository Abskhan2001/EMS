import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getUnseenMessageCount } from './chatlib/supabasefunc';
import { useAuthStore } from '../lib/store';
import { supabase } from '../lib/supabase';

function Chatbutton({ openchat }: { openchat: () => void }) {
  console.log("logging from the chatbtn");
  const currentuser = useAuthStore((state) => state.user);
  const [messageCount, setMessageCount] = useState(0);

  const handleClick = () => {
    // Simply call the function passed from App.tsx
    if (typeof openchat === 'function') {
      openchat();
    } else {
      console.error('openchat is not a function:', openchat);
    }
  };

  useEffect(() => {
    const getMessageCount = async () => {
      try {
        const count = await getUnseenMessageCount(currentuser?.id);
        console.log('Message count:', count);
        setMessageCount(count);
      } catch (error) {
        console.error('Error fetching unseen message count:', error);
        setMessageCount(0);
      }
    };

    getMessageCount();

    if (!currentuser?.id) return;

    // Real-time subscription to messages table (COMMENTED OUT)
    // const channel = supabase
    //   .channel(`unseen-messages-${currentuser.id}`)
    //   .on(
    //     'postgres_changes',
    //     {
    //       event: '*', // Listen to INSERT, UPDATE, DELETE
    //       schema: 'public',
    //       table: 'messages',
    //       filter: `reciever_id=eq.${currentuser.id}`,
    //     },
    //     async () => {
    //       await getMessageCount(); // Refresh count when a change happens
    //     }
    //   )
    //   .subscribe();

    // return () => {
    //   supabase.removeChannel(channel);
    // };
  }, [currentuser]);

  // If openchat is not provided, don't render the button
  if (!openchat) {
    return null;
  }

  return (
    <motion.div
      onClick={handleClick}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      whileHover={{ scale: 1.05 }}
      className="
          fixed
          bottom-4
          right-4
          flex
          items-center
          justify-center
          bg-gradient-to-r
          from-[#a36fd4]
          to-blue-500
          rounded-full
          shadow-lg
          hover:shadow-xl
          transition-shadow
          duration-300
          w-16
          z-50
          h-16
          border-2
          cursor-pointer
          border-white">
      <MessageCircle className="w-8 h-8 text-white" />
      {messageCount > 0 && (
        <div className="absolute -top-2 -right-2">
          <div className="
              relative
              flex
              items-center
              justify-center
              w-6
              h-6
              bg-red-500
              text-white
              text-xs
              font-bold
              rounded-full
              border-2
              border-white">
            {messageCount}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default Chatbutton;