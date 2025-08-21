import { Play, ArrowRight, Sparkles, Zap, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const Hero = () => {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const texts = ['Work Smarter, Deliver Faster — With Estrowork'];

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
    <section id="home" className="relative min-h-screen pt-16 bg-gradient-to-br from-blue-600 to-purple-700">
      {/* Simple Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-700/10"></div>

      <motion.div
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="text-center">
          {/* Main Heading with Typewriter Effect */}
          <motion.div variants={itemVariants} className="mb-6">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
              <span className="block mb-2">Estrowork is your all-in-one workspace—</span>
              <span className="relative">
                <span className="text-yellow-300 text-1xl md:text-3xl lg:text-4xl">
                  {currentText}
                </span>
                <motion.span
                  className="inline-block w-1 h-12 md:h-16 bg-yellow-300 ml-1"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl text-blue-100 mb-8 max-w-4xl mx-auto leading-relaxed"
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
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400 text-blue-900 shadow-lg font-semibold"
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

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <motion.button
              className="group relative bg-yellow-400 text-blue-900 px-8 py-4 rounded-xl font-bold shadow-xl overflow-hidden"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="absolute inset-0 bg-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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
              className="group border-2 border-yellow-400 text-yellow-400 px-8 py-4 rounded-xl font-semibold hover:bg-yellow-400 hover:text-blue-900 transition-all duration-300 backdrop-blur-sm bg-white/10"
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

          {/* Dashboard Preview with Overlaid Text */}
          <motion.div
            variants={itemVariants}
            className="relative max-w-5xl mx-auto"
          >
            <motion.div
              className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-white/20"
              whileHover={{ y: -10, rotateX: 5 }}
              transition={{ duration: 0.3 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Glowing border effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-indigo-500/20 rounded-2xl blur-xl"></div>

              {/* YouTube Video */}
              <motion.div
                className="relative w-full aspect-video rounded-xl shadow-lg overflow-hidden"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.5, duration: 0.8 }}
              >
                <iframe
                  src="https://www.youtube.com/embed/bGrfdYYwEes"
                  title="Estrowork Demo Video"
                  className="w-full h-full rounded-xl border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </motion.div>

          {/* Text Over Image */}
{/* <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-6 md:px-8 lg:px-12 text-center">
  <p className="text-white text-sm sm:text-base md:text-lg lg:text-2xl font-semibold bg-black/50 p-4 sm:p-6 md:p-8 rounded-xl backdrop-blur-md max-w-xl sm:max-w-2xl lg:max-w-4xl">
    No need to juggle multiple tools like Jira, Asana, or Trello anymore.
    <br />
    <span className="text-yellow-300">Estrowork</span> brings everything together in a clean, easy-to-use platform that your entire team will love.
    <br /><br />
    Enjoy <span className="text-yellow-300">AI-powered insights</span>, <span className="text-yellow-300">location tracking</span>, and <span className="text-yellow-300">24/7 system availability</span>—all in one place.
  </p>
</div> */}

{/* Static UI Elements */}
<div className="absolute -top-2 sm:-top-4 -right-2 sm:-right-4 bg-yellow-400 text-blue-900 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold shadow-lg">
  99.9% Uptime
</div>

<div className="absolute -bottom-2 sm:-bottom-4 -left-2 sm:-left-4 bg-yellow-400 text-blue-900 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold shadow-lg">
  Real-time Analytics
</div>

            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;