import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ImageWithTextProps {
  imageUrl: string;
  title: string;
  description: string;
  buttonText?: string;
  reverse?: boolean; // if true, image will be on right
}

const ImageWithText: React.FC<ImageWithTextProps> = ({
  imageUrl,
  title,
  description,
  buttonText,
  reverse = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState('');

  // Video mapping based on button text
  const getVideoId = (buttonText: string) => {
    switch (buttonText) {
      case 'See Attendance Demo':
        return 'AZ2dZMAzX7c';
      case 'View Team Features':
        return 'nJT-2wVKAG4';
      default:
        return '';
    }
  };

  const openVideoModal = (videoId: string) => {
    setCurrentVideo(videoId);
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeVideoModal = () => {
    setIsModalOpen(false);
    setCurrentVideo('');
    document.body.style.overflow = 'unset';
  };

  const handleButtonClick = () => {
    const videoId = getVideoId(buttonText || '');
    if (videoId) {
      openVideoModal(videoId);
    }
  };
  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex flex-col-reverse md:flex-row ${
            reverse ? 'md:flex-row-reverse' : ''
          } items-center gap-12`}
        >
          {/* Image Section */}
          <motion.div
            className="w-full md:w-1/2"
            initial={{ opacity: 0, x: reverse ? 50 : -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <img
              src={imageUrl}
              alt={title}
              className="rounded-xl shadow-xl w-full object-cover"
            />
          </motion.div>

          {/* Text Section */}
          <motion.div
            className="w-full md:w-1/2 space-y-6"
            initial={{ opacity: 0, x: reverse ? -50 : 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              {title}
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              {description}
            </p>
            {buttonText && (
  <div className="text-right">
    <motion.button
      onClick={handleButtonClick}
      className="relative inline-block px-6 py-3 text-white font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-purple-700 shadow-md overflow-hidden"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      <motion.div
        className="absolute inset-0 bg-white/20"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.6 }}
      />
      <span className="relative z-10">{buttonText}</span>
    </motion.button>
  </div>
)}

          </motion.div>
        </div>
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeVideoModal}
          >
            <motion.div
              className="relative w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={closeVideoModal}
                className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors duration-200"
              >
                <X size={24} />
              </button>

              {/* YouTube Video */}
              <iframe
                src={`https://www.youtube.com/embed/${currentVideo}?autoplay=1`}
                title="Demo Video"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default ImageWithText;