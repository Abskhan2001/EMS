import React from 'react';
import { motion } from 'framer-motion';

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
  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50 overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex flex-col md:flex-row ${
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
    </section>
  );
};

export default ImageWithText;
