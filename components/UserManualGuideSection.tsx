"use client";

import React, { useState } from "react";
import { Shield, Users, FileText, Lock, CheckCircle2, XCircle, AlertTriangle, UserCheck, Award, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function UserManualGuideSection() {
  const [activeTab, setActiveTab] = useState<"roles" | "routes" | "editing" | "policies">("roles");

  const tabs = [
    { id: "roles", label: "1. Role Hierarchy & Scope", icon: Users },
    { id: "routes", label: "2. Page & Route Permissions", icon: Shield },
    { id: "editing", label: "3. Data Creation & Editing", icon: FileText },
    { id: "policies", label: "4. Security & Governance", icon: Lock },
  ];

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-[#EADFCE] bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <p className="text-xs sm:text-sm tracking-[0.25em] font-bold text-[#A65353] uppercase mb-2">
            DOCUMENTATION & USER GUIDE
          </p>
          <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-4 relative inline-block">
            <span className="relative z-10">Access Control & Manual</span>
            <span className="absolute bottom-1.5 left-0 w-full h-3.5 bg-[#EAE0D0] -z-10 rounded-full" />
          </h2>
          <p className="text-sm sm:text-base text-gray-600 font-medium">
            Official system reference detailing role hierarchies, page authorizations, data modification permissions, and security rules across the Srijan Portal.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-12">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  backgroundColor: isActive ? "#A65353" : "#FFFFFF",
                  color: isActive ? "#FFFFFF" : "#374151",
                  borderColor: isActive ? "#A65353" : "#EADFCE",
                }}
                className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 cursor-pointer border shadow-sm ${
                  isActive ? "shadow-md scale-102 font-extrabold" : "hover:bg-[#FAF6F0]"
                }`}
              >
                <Icon
                  style={{ color: isActive ? "#FDE68A" : "#A65353" }}
                  className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
                />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Area */}
        <div className="bg-white rounded-3xl border-2 border-[#EADFCE] shadow-lg p-5 sm:p-8 md:p-10 min-h-[420px]">
          <AnimatePresence mode="wait">
            {activeTab === "roles" && (
              <motion.div
                key="roles"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Users className="w-6 h-6 text-[#A65353]" />
                    Role Hierarchy & User Scope Specification
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Each user account is assigned a numeric hierarchy rank determining their operational scope and administrative reach.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-gray-200">
                  <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead>
                      <tr className="bg-[#8B6B61] text-white text-xs sm:text-sm uppercase tracking-wider">
                        <th className="py-3.5 px-4 font-bold">Rank</th>
                        <th className="py-3.5 px-4 font-bold">Role Identifier</th>
                        <th className="py-3.5 px-4 font-bold">System Title</th>
                        <th className="py-3.5 px-4 font-bold">Scope & Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-xs sm:text-sm font-medium">
                      <tr className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-4 px-4 font-extrabold text-[#8B3A3A]">5.0</td>
                        <td className="py-4 px-4">
                          <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-800 font-bold border border-red-200 uppercase text-xs">
                            admin
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold text-gray-900">System Administrator</td>
                        <td className="py-4 px-4 text-gray-600 leading-relaxed">
                          Supreme system authority. Unrestricted global access across all programs, users, system settings, database management, and role promotions.
                        </td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-4 px-4 font-extrabold text-amber-700">4.0</td>
                        <td className="py-4 px-4">
                          <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200 uppercase text-xs">
                            program_manager
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold text-gray-900">Program Manager</td>
                        <td className="py-4 px-4 text-gray-600 leading-relaxed">
                          Assigned program lead. Manages assigned programs, schedules sessions, assigns/promotes volunteers within scope, marks attendance, and holds full account deletion rights.
                        </td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-4 px-4 font-extrabold text-blue-700">3.0</td>
                        <td className="py-4 px-4">
                          <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200 uppercase text-xs">
                            volunteer
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold text-gray-900">Volunteer / Mentor</td>
                        <td className="py-4 px-4 text-gray-600 leading-relaxed">
                          Active operational support. Can register and manage assigned participants (mentees), mark attendance, view program analytics, and submit promotion requests.
                        </td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-4 px-4 font-extrabold text-emerald-700">2.0</td>
                        <td className="py-4 px-4">
                          <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 uppercase text-xs">
                            participant
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold text-gray-900">Participant / Mentee</td>
                        <td className="py-4 px-4 text-gray-600 leading-relaxed">
                          Registered festival attendee. Views enrolled program sessions, personal profile, and individual attendance history.
                        </td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-4 px-4 font-extrabold text-gray-500">1.0</td>
                        <td className="py-4 px-4">
                          <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-bold border border-gray-300 uppercase text-xs">
                            guest
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold text-gray-900">Guest User</td>
                        <td className="py-4 px-4 text-gray-600 leading-relaxed">
                          Newly onboarded registrant awaiting administrative verification. Restricted strictly to profile viewing until verified.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === "routes" && (
              <motion.div
                key="routes"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-[#A65353]" />
                    Frontend Route & Access Matrix
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Defines UI accessibility rules across system paths enforced by middleware and page-level guards.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-gray-200">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-[#8B6B61] text-white text-xs sm:text-sm uppercase tracking-wider">
                        <th className="py-3.5 px-4 font-bold">Route Path</th>
                        <th className="py-3.5 px-3 text-center font-bold">Admin</th>
                        <th className="py-3.5 px-3 text-center font-bold">Program Mgr</th>
                        <th className="py-3.5 px-3 text-center font-bold">Volunteer</th>
                        <th className="py-3.5 px-3 text-center font-bold">Participant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-xs sm:text-sm font-medium">
                      <tr className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900">/dashboard</td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-emerald-700">✔ Yes</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-emerald-700">✔ Yes</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-emerald-700">✔ Yes</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-red-600">✘ No</span></td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900">/profile</td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-emerald-700">✔ Yes</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-emerald-700">✔ Yes</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-emerald-700">✔ Yes</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-emerald-700">✔ Yes</span></td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900">/programs/[id]/sessions</td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-emerald-700">✔ Yes</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-emerald-700">✔ Assigned</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-emerald-700">✔ Assigned</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-emerald-700">✔ Enrolled</span></td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900">/programs/[id]/participants</td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-emerald-700">✔ Yes</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-emerald-700">✔ Assigned</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-emerald-700">✔ Mentees</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-red-600">✘ No</span></td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900">/programs/[id]/volunteers</td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-emerald-700">✔ Yes</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-emerald-700">✔ Assigned</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-red-600">✘ No</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-red-600">✘ No</span></td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900">/admin/volunteer-requests</td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-emerald-700">✔ Yes</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-emerald-700">✔ Yes</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-red-600">✘ No</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="inline-flex items-center font-bold text-red-600">✘ No</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === "editing" && (
              <motion.div
                key="editing"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-[#A65353]" />
                    Data Creation & Editing Matrix
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Specifies exact modification capabilities for core database models and records.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-gray-200">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-[#8B6B61] text-white text-xs sm:text-sm uppercase tracking-wider">
                        <th className="py-3.5 px-4 font-bold">Action / Domain</th>
                        <th className="py-3.5 px-3 text-center font-bold">Admin</th>
                        <th className="py-3.5 px-3 text-center font-bold">Program Mgr</th>
                        <th className="py-3.5 px-3 text-center font-bold">Volunteer</th>
                        <th className="py-3.5 px-3 text-center font-bold">Participant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-xs sm:text-sm font-medium">
                      <tr className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900">Create / Delete Programs</td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-emerald-700">✔ Full Rights</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-red-600">✘ No</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-red-600">✘ No</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-red-600">✘ No</span></td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900">Create / Edit Sessions</td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-emerald-700">✔ Full Rights</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-emerald-700">✔ Assigned Programs</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-red-600">✘ No</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-red-600">✘ No</span></td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900">Mark / Update Attendance</td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-emerald-700">✔ Full Rights</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-emerald-700">✔ Assigned Programs</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-emerald-700">✔ Assigned Mentees</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-red-600">✘ View Only</span></td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900">Register Participants</td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-emerald-700">✔ Full Rights</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-emerald-700">✔ Full Rights</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-emerald-700">✔ Full Rights</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-red-600">✘ No</span></td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900">Promote User Role</td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-emerald-700">✔ Direct Promotion</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-emerald-700">✔ Up to Volunteer</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-amber-700">▲ Request Only</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-red-600">✘ No</span></td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5] transition-colors bg-amber-50/50">
                        <td className="py-3.5 px-4 font-extrabold text-gray-900">Archive / Delete User Accounts</td>
                        <td className="py-3.5 px-3 text-center"><span className="font-extrabold text-emerald-700">✔ Full Rights</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="font-extrabold text-emerald-700">✔ Full Rights</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-red-600">✘ No</span></td>
                        <td className="py-3.5 px-3 text-center"><span className="font-bold text-red-600">✘ No</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === "policies" && (
              <motion.div
                key="policies"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Lock className="w-6 h-6 text-[#A65353]" />
                    Key Security & Governance Policies
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Mandatory operational rules ensuring database integrity and role authorization boundaries.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Card 1 */}
                  <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#EADFCE] shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-red-100 text-red-800">
                          <Trash2 className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-base">Program Manager Deletion Authority</h4>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        Program Managers hold authoritative rights to delete or archive user accounts (`isArchived: true`), matching Admin capability for effective community governance.
                      </p>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#EADFCE] shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
                          <Award className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-base">Subordinate Rank Protection</h4>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        An actor can never promote, demote, or modify an account whose rank is equal to or greater than their own (`targetRank &gt;= actorRank`).
                      </p>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#EADFCE] shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-blue-100 text-blue-800">
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-base">Guest Monopoly Policy</h4>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        Newly registered unverified accounts (`guest`) can only be verified and promoted to active operational roles by system Administrators.
                      </p>
                    </div>
                  </div>

                  {/* Card 4 */}
                  <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#EADFCE] shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-purple-100 text-purple-800">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-base">Attendance Lock Policy</h4>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        To maintain identity verification accuracy, a user&apos;s phone number is locked once registered and can only be altered through formal administrative override.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
