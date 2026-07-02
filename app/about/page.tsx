"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UserManualGuideSection from "@/components/UserManualGuideSection";
import { Play, ExternalLink, ArrowLeft } from "lucide-react";
import { motion, Variants } from "framer-motion";

interface VideoItem {
  id: string;
  category: string;
  title: string;
  youtubeUrl: string;
}

const videos = [
  {
    title: "Kirtan Soiree",
    type: "Kirtans",
    videoId: "wKue1OJ_GmU",
  },
  {
    title: "Gita Insight Series",
    type: "Lectures",
    videoId: "2H0HIOWwcY8",
  },
  {
    title: "Chanting",
    type: "Chanting names of Krishna",
    videoId: "xBqNUisRtmo",
  },
  {
    title: "Association",
    type: "Meet Devotees from Bhubaneswar",
    videoId: "p92ySLI_2PU",
  }
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function AboutPage() {
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-gray-800 selection:bg-[#A65353]/20">
      <Header />

      <main className="flex-grow">
        {/* Section 1: Hero Banner ("What Is It?") */}
        <section className="relative bg-gradient-to-b from-[#B58251] via-[#A47140] to-[#8F5D2C] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden shadow-sm">
          {/* Subtle warm lighting glows */}
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-amber-300/15 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-black/20 rounded-full blur-3xl pointer-events-none translate-y-1/2" />

          {/* Content Container */}
          <div className="relative max-w-4xl mx-auto text-center">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/10 border border-amber-200/30 text-xs sm:text-sm tracking-[0.28em] font-bold text-amber-100 uppercase mb-6 shadow-sm backdrop-blur-md">
              ✨ Hare Krishna Philosophy
            </div>

            {/* Authoritative Main Heading (Quicksand) */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white mb-8 tracking-tight drop-shadow-md">
              What Is It?
            </h1>

            {/* Premium Glass Mantra Box */}
            <div className="relative rounded-3xl bg-white/10 backdrop-blur-xl border border-amber-200/40 p-8 sm:p-14 max-w-2xl mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-500 hover:border-amber-200/60">
              {/* Inner gold subtle glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-300/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-orange-300/20 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 space-y-4 sm:space-y-6">
                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-amber-200/60 to-transparent mx-auto rounded-full" />

                <p className="text-base sm:text-xl md:text-2xl font-bold tracking-[0.22em] text-white leading-relaxed uppercase drop-shadow-sm">
                  Hare Krishna Hare Krishna<br />
                  Krishna Krishna Hare Hare<br />
                  <span className="inline-block my-1.5 sm:my-2 w-12 h-[1px] bg-amber-200/30" /><br />
                  Hare Rama Hare Rama<br />
                  Rama Rama Hare Hare
                </p>

                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-amber-200/60 to-transparent mx-auto rounded-full" />
              </div>
            </div>

            {/* Bottom Subtitle */}
            <p className="text-sm sm:text-base md:text-lg font-semibold text-amber-100/95 mt-8 max-w-xl mx-auto leading-relaxed drop-shadow-sm">
              The maha-mantra is the sublime method for reviving our Krishna consciousness.
            </p>
          </div>
        </section>

        {/* Section 2: "The Key" */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-[#EADFCE]">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Column: Text */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <p className="text-xs sm:text-sm tracking-[0.2em] font-bold text-[#8B3A3A] uppercase mb-2">
                  CONSCIOUSNESS IS THE KEY
                </p>
                <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 relative inline-block">
                  <span className="relative z-10">The Key</span>
                  <span className="absolute bottom-1.5 left-0 w-full h-3.5 bg-white/60 -z-10 rounded-full" />
                </h2>
              </div>

              <div className="space-y-5 text-gray-900 font-medium text-sm sm:text-base leading-relaxed text-left sm:text-justify">
                <p>
                  As living spiritual souls we are all originally Krishna conscious entities, but due to our association with matter from time immemorial, our consciousness is now polluted by material atmosphere. In this polluted concept of life, we are all trying to exploit the resources of material nature, but actually we are becoming more and more entangled in her complexities. This illusion is called maya, or hard struggle for existence for winning over the stringent laws of material nature. This illusory struggle against the material nature can at once be stopped by revival of our Krishna consciousness.
                </p>
                <p>
                  Krishna consciousness is not an artificial imposition on the mind. This consciousness is the original energy of the living entity. When we hear the transcendental vibration, this consciousness is revived and the process is recommended by authorities for this age. By practical experience also, we can perceive that by chanting this maha-mantra, or the great chanting for deliverance, one can at once feel transcendental ecstasy from the spiritual stratum.
                </p>
                <p>
                  When one is factually on the plane of spiritual understanding, surpassing the stages of sense, mind and intelligence, one is situated on the transcendental plane. This chanting of Hare Krishna, Hare Krishna, Krishna Krishna, Hare Hare, Hare Rama, Hare Rama, Rama Rama, Hare Hare is directly enacted from the spiritual platform, surpassing all lower status of consciousness, namely sensual, mental, and intellectual.
                </p>
              </div>
            </div>

            {/* Right Column: Image */}
            <div className="lg:col-span-6 w-full flex flex-col items-center justify-center">
              <div className="relative w-full rounded-3xl sm:rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-white/40 bg-black group flex flex-col">
                <img
                  src="/modes.png"
                  alt="The Three Modes of Material Nature"
                  className="w-full h-auto object-contain transform group-hover:scale-102 transition-transform duration-500 block"
                />
                {/* Caption: positioned below image on mobile so artwork is 100% visible, overlay on larger screens */}
                <div className="relative sm:absolute sm:bottom-4 sm:inset-x-4 bg-black/95 sm:bg-black/90 sm:backdrop-blur-md sm:rounded-2xl p-5 sm:p-6 border-t border-white/15 sm:border sm:border-white/20 text-white text-xs sm:text-sm leading-relaxed shadow-xl font-medium">
                  All living beings in the material world are controlled like puppets by the three modes of nature. Those modes are in turn controlled by Lord Sri Krishna, the Supreme Personality of Godhead.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: "The Process and the Goal" */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-[#EADFCE] bg-[#FDFBF7]">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs sm:text-sm tracking-[0.2em] font-bold text-[#A65353] uppercase mb-2">
              KRISHNA&apos;S NAME
            </p>
            <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-10 relative inline-block">
              <span className="relative z-10">The Process and the Goal</span>
              <span className="absolute bottom-1.5 left-0 w-full h-3.5 bg-[#EAE0D0] -z-10 rounded-full" />
            </h2>

            <div className="space-y-6 text-gray-700 text-sm sm:text-base leading-relaxed text-left sm:text-justify max-w-3xl mx-auto">
              <p>
                There is no need of understanding the language of the mantra, nor is there any need of mental speculation, nor any intellectual adjustment for chanting this maha-mantra. It springs automatically from the spiritual platform, and as such, anyone can take part in this transcendental sound vibration without any previous qualification and dance in ecstasy. We have seen it practically. Even a child can take part in the chanting, or even a dog can take part in it.
              </p>
              <p>
                This chanting should be heard from the lips of a pure devotee of the Lord so that immediate effect can be achieved. As far as possible, chanting from the lips of a non-devotee should be avoided, as much as milk touched by the lips of a serpent causes poisonous effect.
              </p>
              <p>
                The word Hara is a form of addressing the energy of the Lord. Both Krishna and Rama are forms of addressing directly the Lord and they mean, &quot;the highest pleasure eternal.&quot; Hara is the supreme pleasure potency of the Lord. This potency, when addressed as Hare, helps us in reaching the Supreme Lord.
              </p>
              <p>
                The material energy, called maya, is also one of the multi-potencies of the Lord, as much as we are also marginal potency of the Lord. The living entities are described as superior energy than matter. When the superior energy is in contact with the inferior energy, it becomes an incompatible situation. But when the supreme marginal potency is in contact with the spiritual potency, Hara, it becomes the happy, normal condition of the living entity.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: User Manual & Access Control Guide */}
        <UserManualGuideSection />

        {/* Section 5: Video Gallery */}
        <section className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <motion.div
              className="max-w-3xl"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <motion.p
                variants={itemVariants}
                className="text-xs font-bold uppercase tracking-[0.25em] text-[#C59B27] mb-2 sm:mb-3"
              >
                VIDEO GALLERY
              </motion.p>
              <motion.h2
                variants={itemVariants}
                className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 tracking-tight leading-tight"
              >
                Hear the kirtan, feel the wisdom, relive the festivals
              </motion.h2>
              <motion.p
                variants={itemVariants}
                className="m-3 sm:mt-4 text-sm sm:text-base text-gray-600 font-medium"
              >
                Curated highlights from kirtans, lectures, festivals, and student voices.
              </motion.p>
            </motion.div>

            <div className="mt-10 sm:mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {videos.map((video, index) => (
                <motion.article
                  key={video.title}
                  className="group overflow-hidden rounded-3xl border border-[#E8DFD5] bg-white shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: index * 0.05 }}
                >
                  <div className="relative aspect-video w-full bg-black overflow-hidden">
                    <iframe
                      title={video.title}
                      src={`https://www.youtube.com/embed/${video.videoId}`}
                      className="h-full w-full border-0"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <div className="p-6 sm:p-7 bg-white flex flex-col flex-grow">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#C59B27] mb-1.5">
                      {video.type.toUpperCase()}
                    </p>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 group-hover:text-[#A65353] transition-colors">
                      {video.title}
                    </h3>
                  </div>
                </motion.article>
              ))}
            </div>

            {/* Back to Home Button */}
            <motion.div
              className="mt-14 sm:mt-16 flex justify-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <a
                href={`${process.env.NEXT_PUBLIC_APP_URL || "https://www.srijanvraj.com"}/dashboard`}
                className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-[#B58251] via-[#A47140] to-[#8F5D2C] text-white font-bold text-base sm:text-lg shadow-md hover:shadow-xl hover:shadow-[#A47140]/30 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 overflow-hidden border border-amber-200/30"
              >
                <span className="absolute inset-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <ArrowLeft className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
                <span>Back to home</span>
              </a>
            </motion.div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
