import { Play, ArrowRight, Sparkles, Zap, Shield, X } from 'lucide-react';
import { motion, AnimatePresence, color } from 'framer-motion';
import { useEffect, useState } from 'react';

// Add glow styles
const glowStyles = `
  /* ==== Glow Text Styles ==== */
  .glow-text {
    color: #fde047; /* yellow-400 */
    text-shadow:
      0 0 5px rgba(50, 20, 21, 0.9),
      0 0 10px rgba(50, 20, 21, 0.8),
      0 0 20px rgba(50, 20, 21, 0.7),
      0 0 40px rgba(50, 20, 21, 0.6);
  }

  /* Purple text override for subtitle */
  .text-[#7D22CE] {
    // text-shadow:
    //   0 0 5px rgba(125, 34, 206, 0.9),
    //   0 0 10px rgba(125, 34, 206, 0.8),
    //   0 0 20px rgba(125, 34, 206, 0.7),
    //   0 0 40px rgba(125, 34, 206, 0.6) !important;
  }

  /* Headings stronger glow */
  .glow-heading {
    color: #fde047; /* yellow-300 */
    text-shadow:
      0 0 8px rgba(50, 20, 21, 1),
      0 0 15px rgba(50, 20, 21, 0.9),
      0 0 30px rgba(50, 20, 21, 0.8),
      0 0 50px rgba(50, 20, 21, 0.7);
  }

  /* ==== Glow Button Styles ==== */
  .glow-btn {
    background: linear-gradient(to right, #2563eb, #7e22ce); /* purple-700 */
    color: #FFFFFF; /* readable on yellow */
    font-weight: 600;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease-in-out;
    box-shadow:
      0 0 5px rgba(50, 20, 21, 0.9),
      0 0 15px rgba(50, 20, 21, 0.7),
      0 0 30px rgba(50, 20, 21, 0.6);
  }

  /* Hover Effect for Buttons */
  .glow-btn:hover {
  color: #000000;
    background: #fde047; /* lighter yellow */
    box-shadow:
      0 0 10px rgba(25, 20, 21, 1),
      0 0 25px rgba(25, 20, 21, 0.9),
      0 0 45px rgba(25, 20, 21, 0.8);
    transform: scale(1.05);
  }
`;

const Hero = () => {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState('');

  useEffect(() => {
    const texts = ['Work Smarter, Deliver Faster — With Estrowork'];

    const timeout = setTimeout(() => {
      const current = texts[currentIndex];

      if (isDeleting) {
        setCurrentText(current.substring(0, currentText.length - 1));
      } else {
        setCurrentText(current.substring(0, currentText.length + 1));
      }

      if (!isDeleting && currentText === current) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && currentText === '') {
        setIsDeleting(false);
        setCurrentIndex((currentIndex + 1) % texts.length);
      }
    }, isDeleting ? 50 : 100);

    return () => clearTimeout(timeout);
  }, [currentText, currentIndex, isDeleting]);

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8
      }
    }
  };

  return (
    <section id="home" className="relative min-h-screen pt-16 bg-gradient-to-br from-blue-600 to-purple-700 overflow-x-hidden w-full max-w-full">
      {/* Inject glow styles */}
      <style dangerouslySetInnerHTML={{ __html: glowStyles + `
        /* Ensure no horizontal overflow */
        body { overflow-x: hidden; }
        html { overflow-x: hidden; }
        * { box-sizing: border-box; }
      ` }} />

      {/* Text and Buttons Area with Background Image - Full Width */}
      <div className="relative w-full">
        {/* Background Image for text area only - Full Width */}
        <div
          className="absolute inset-0 w-full bg-cover bg-center bg-no-repeat bg-black/100"
          style={{
            opacity: 0.5,
            backgroundColor: '#000000',
            backgroundImage: 'url(/bg-1.jpg)',
            height: '91vh'
          }}
        ></div>

        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/100" style={{ height: '91vh' }}></div>

        {/* Content */}
        <motion.div
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Main Heading with Typewriter Effect */}
          <motion.div variants={itemVariants} className="mb-6">
            <h1 className="glow-heading text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold">
              <span className="block mb-2">Estrowork is your all-in-one workspace</span>
              <span className="relative block h-10 sm:h-12 md:h-16 lg:h-20">
                <span className="glow-text text-xs sm:text-xl md:text-3xl lg:text-4xl">
                  {currentText}
                </span>
                <motion.span
                  className="inline-block w-1 h-6 sm:h-8 md:h-12 lg:h-16 bg-yellow-300 ml-1 align-middle"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-white text-lg sm:text-xl md:text-2xl mb-8 max-w-4xl mx-auto leading-relaxed"
            style={{
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(0, 0, 0, 0.5)'
            }}
          >
            Manage your team, organize your projects, assign tasks, and even invite clients to collaborate on specific projects in real-time.
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap justify-center gap-4 mb-12"
          >
            {[
              { icon: Sparkles, text: 'AI-Powered' },
              { icon: Zap, text: 'Real-time' },
              { icon: Shield, text: 'Secure' }
            ].map((feature, index) => (
              <motion.div
                key={feature.text}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#d4af37] text-[#FFFFFF] shadow-lg font-semibold"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + index * 0.1 }}
              >
                <feature.icon size={16} />
                <span className="text-sm font-medium">{feature.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Buttons - Desktop: inside background, Mobile: hidden */}
          <motion.div
            variants={itemVariants}
            className="hidden sm:flex flex-row gap-4 justify-center mb-16"
          >
            <motion.button
              className="glow-btn group relative px-8 py-4 rounded-xl font-bold overflow-hidden"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative flex items-center justify-center gap-2">
                Start Free Trial
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight size={20} />
                </motion.div>
              </div>
            </motion.button>

            <motion.button
              onClick={() => openVideoModal('bGrfdYYwEes')}
              className="glow-btn group px-8 py-4 rounded-xl font-semibold"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex items-center justify-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Play size={20} />
                </motion.div>
                Watch Demo
              </div>
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {/* CTA Buttons - Mobile only: outside background area */}
      <motion.div
        className="sm:hidden relative w-full max-w-full px-4 py-8 overflow-x-hidden"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ width: '100vw', maxWidth: '100%' }}
      >
        <motion.div
          variants={itemVariants}
          className="flex flex-row gap-2 justify-center max-w-full flex-wrap"
          style={{ width: '100%', maxWidth: '100%' }}
        >
          <motion.button
            className="glow-btn group relative px-4 py-3 rounded-xl font-bold overflow-hidden text-xs flex-shrink-0"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="relative flex items-center justify-center gap-1">
              Start Trial
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight size={14} />
              </motion.div>
            </div>
          </motion.button>

          <motion.button
            onClick={() => openVideoModal('bGrfdYYwEes')}
            className="glow-btn group px-4 py-3 rounded-xl font-semibold text-xs flex-shrink-0"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center justify-center gap-1">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Play size={14} />
              </motion.div>
              Watch Demo
            </div>
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Dashboard Preview with Overlaid Text */}
      <motion.div
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mt-1 overflow-x-hidden"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
          <motion.div
            variants={itemVariants}
            className="relative max-w-5xl mx-auto"
          >
            <motion.div
              className="relative bg-transparent rounded-2xl shadow-none p-0"
              whileHover={{ y: -10, rotateX: 5 }}
              transition={{ duration: 0.3 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Enhanced glowing border with #7D22CE */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  boxShadow: `
                    0 0 20px 6px #7D22CE,
                    0 0 40px 12px #7D22CE,
                    0 0 80px 24px #7D22CE,
                    0 0 0 8px #7D22CE inset
                  `
                }}
              ></div>

              <motion.div
                className="relative w-full aspect-video rounded-xl "
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.5, duration: 0.8 }}
              >
                <iframe
                  src="https://www.youtube.com/embed/bGrfdYYwEes?autoplay=1&mute=1"
                  title="Estrowork Demo Video"
                  className="w-full h-full rounded-xl border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </motion.div>
            </motion.div>
          </motion.div>
      </motion.div>

      {/* Video Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
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

export default Hero;
