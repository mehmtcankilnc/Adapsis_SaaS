"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { UserManagementClient } from "./UserManagementClient";
import { GeneralSettingsForm } from "./GeneralSettingsForm";
import type { GlobalSettings } from "@/types/product.types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function SettingsClient({
  settings,
  currentUserId,
}: {
  settings: GlobalSettings | null;
  currentUserId: string;
}) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"general" | "users">("general");

  return (
    <div className="w-full">
      <div className="flex justify-center mb-8">
        <div className="relative flex bg-slate-200/50 rounded-full p-1 w-full max-w-sm">
          {(["general", "users"] as const).map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex-1 py-2.5 text-sm font-semibold rounded-full z-10 transition-colors duration-300 ${
                  isSelected ? "text-brand-700" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab === "general" ? t("admin.settings.tabs.general") : t("admin.settings.tabs.users")}
                {isSelected && (
                  <motion.div
                    layoutId="pill"
                    className="absolute inset-0 bg-white shadow-sm rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === "general" ? (
          <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm">
            <GeneralSettingsForm settings={settings} />
          </div>
        ) : (
          <UserManagementClient currentUserId={currentUserId} />
        )}
      </motion.div>
    </div>
  );
}
