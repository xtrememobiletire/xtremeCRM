"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LOGIN_URL } from "@/lib/config";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Truck,
  Lock,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

interface FormData {
  companyName: string;
  companyWebsite: string;
  companyEmail: string;
  phoneNumber: string;
  companyAddress: string;
  numberOfVehicles: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  [key: string]: string;
}

const INITIAL_DATA: FormData = {
  companyName: "",
  companyWebsite: "",
  companyEmail: "",
  phoneNumber: "",
  companyAddress: "",
  numberOfVehicles: "",
  password: "",
  confirmPassword: "",
};

const STEPS = [
  { id: 1, label: "Company", description: "Company profile and website" },
  { id: 2, label: "Contact", description: "Email and phone details" },
  { id: 3, label: "Fleet", description: "Operating address and fleet size" },
  { id: 4, label: "Access", description: "Secure password setup" },
];

export default function FleetCreateAccount() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_DATA);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [direction, setDirection] = useState<number>(1);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};

    if (step === 1) {
      if (!formData.companyName.trim()) {
        newErrors.companyName = "Company Name is required.";
      }
    } else if (step === 2) {
      if (!formData.companyEmail.trim()) {
        newErrors.companyEmail = "Company Email is required.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.companyEmail.trim())) {
        newErrors.companyEmail = "Please enter a valid email address.";
      }

      if (!formData.phoneNumber.trim()) {
        newErrors.phoneNumber = "Phone Number is required.";
      }
    } else if (step === 3) {
      if (!formData.companyAddress.trim()) {
        newErrors.companyAddress = "Company Address is required.";
      }
      if (!formData.numberOfVehicles.trim()) {
        newErrors.numberOfVehicles = "Number of vehicles is required.";
      }
    } else if (step === 4) {
      if (!formData.password) {
        newErrors.password = "Password is required.";
      } else if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters.";
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Confirm Password is required.";
      } else if (formData.confirmPassword !== formData.password) {
        newErrors.confirmPassword = "Passwords do not match.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;

    if (currentStep < 4) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsSubmitted(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleStepClick = (stepId: number) => {
    if (stepId < currentStep) {
      setDirection(-1);
      setCurrentStep(stepId);
    }
  };

  const handleReset = () => {
    setFormData(INITIAL_DATA);
    setErrors({});
    setCurrentStep(1);
    setIsSubmitted(false);
  };

  return (
    <section
      id="create-fleet-account"
      className="w-full pt-8 sm:pt-12 pb-2 sm:pb-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
    >
      {/* Outer Bordered Container matching Wireframe (Split into Two Halves) */}
      <div className="relative border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-none overflow-hidden shadow-sm">
        {/* Blueprint Crosshair Marks (+) at corners */}
        <span className="absolute top-2.5 left-2.5 font-mono text-xs text-zinc-400 dark:text-zinc-600 select-none pointer-events-none z-10">
          +
        </span>
        <span className="absolute top-2.5 right-2.5 font-mono text-xs text-zinc-400 dark:text-zinc-600 select-none pointer-events-none z-10">
          +
        </span>
        <span className="absolute bottom-2.5 left-2.5 font-mono text-xs text-zinc-400 dark:text-zinc-600 select-none pointer-events-none z-10">
          +
        </span>
        <span className="absolute bottom-2.5 right-2.5 font-mono text-xs text-zinc-400 dark:text-zinc-600 select-none pointer-events-none z-10">
          +
        </span>

        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[560px]">
          {/* ========================================================================
              LEFT COLUMN: "Create Your Fleet Account" Headline and Context
              ======================================================================== */}
          <div className="lg:col-span-5 p-8 sm:p-12 lg:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-zinc-300 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40">
            <div>
              {/* Eyebrow */}
              <div className="flex items-center gap-2.5 mb-5">
                <span className="w-2.5 h-2.5 bg-[#DC2626] rounded-none inline-block shadow-sm" />
                <span className="text-xs sm:text-sm font-mono font-bold tracking-widest uppercase text-zinc-700 dark:text-zinc-300">
                  Instant B2B Onboarding
                </span>
              </div>

              {/* Clean Modern Headline */}
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-950 dark:text-white leading-tight mb-4">
                Create Your Fleet Account
              </h2>

              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 font-sans leading-relaxed mb-8 max-w-md">
                Register your commercial fleet to receive your dedicated Fleet Account Code,
                unlock direct driver dispatch, and access consolidated weekly invoicing.
              </p>

              {/* Commercial Value Props */}
              <div className="space-y-3.5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-none bg-[#DC2626]/10 dark:bg-[#DC2626]/20 border border-[#DC2626]/40 text-[#DC2626] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 font-sans font-medium">
                    Instant Fleet Account Code upon submission
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-none bg-[#DC2626]/10 dark:bg-[#DC2626]/20 border border-[#DC2626]/40 text-[#DC2626] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 font-sans font-medium">
                    Consolidated weekly billing and Net 30 terms
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-none bg-[#DC2626]/10 dark:bg-[#DC2626]/20 border border-[#DC2626]/40 text-[#DC2626] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 font-sans font-medium">
                    Live GPS technician tracking for stranded drivers
                  </span>
                </div>
              </div>
            </div>

            {/* Support Note */}
            <div className="pt-8 mt-8 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#DC2626] shrink-0" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
                Need immediate roadside dispatch? Call 24/7 Fleet Line:{" "}
                <a
                  href="tel:18005558473"
                  className="font-semibold text-zinc-900 dark:text-white underline hover:text-[#DC2626] transition-colors cursor-pointer"
                >
                  +1 (800) 555-TIRE
                </a>
              </p>
            </div>
          </div>

          {/* ========================================================================
              RIGHT COLUMN: Interactive 4-Step / 2-Fields Form Card matching Wireframe
              ======================================================================== */}
          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-14 flex items-center justify-center bg-white dark:bg-zinc-950">
            <div className="w-full max-w-xl border border-zinc-300 dark:border-zinc-800 p-6 sm:p-8 lg:p-10 bg-white dark:bg-zinc-950 shadow-sm rounded-none">
              {!isSubmitted ? (
                <div>
                  {/* ==================================================================
                      STEP PROGRESS INDICATOR (4 Connected Circles with Check and Numbers)
                      ================================================================== */}
                  <div className="relative mb-8 sm:mb-10">
                    <div className="flex items-center justify-between relative">
                      {/* Base Background Connecting Line */}
                      <div className="absolute top-5 sm:top-6 left-6 right-6 h-[2px] bg-zinc-200 dark:bg-zinc-800 z-0">
                        {/* Active Progress Connecting Line */}
                        <div
                          className="h-full bg-gradient-to-r from-zinc-950 via-[#DC2626] to-[#DC2626] dark:from-white dark:via-[#DC2626] dark:to-[#DC2626] transition-all duration-300"
                          style={{
                            width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
                          }}
                        />
                      </div>

                      {/* 4 Connected Circles */}
                      {STEPS.map((step) => {
                        const isCompleted = step.id < currentStep;
                        const isCurrent = step.id === currentStep;
                        const isUpcoming = step.id > currentStep;

                        return (
                          <div
                            key={step.id}
                            className="relative z-10 flex flex-col items-center group"
                          >
                            <button
                              type="button"
                              onClick={() => handleStepClick(step.id)}
                              disabled={isUpcoming}
                              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-mono text-xs sm:text-sm transition-all duration-200 ${
                                isCompleted
                                  ? "bg-zinc-950 dark:bg-white text-white dark:text-black border border-zinc-950 dark:border-white shadow-sm cursor-pointer hover:bg-[#DC2626] dark:hover:bg-[#DC2626] dark:hover:text-white"
                                  : isCurrent
                                  ? "bg-[#DC2626] text-white border-2 border-[#DC2626] shadow-[0_0_20px_rgba(220,38,38,0.4)] ring-4 ring-[#DC2626]/20 cursor-default font-bold"
                                  : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 border border-zinc-300 dark:border-zinc-800 cursor-not-allowed font-medium"
                              }`}
                              title={step.label}
                            >
                              <span
                                className={
                                  isCurrent || isCompleted
                                    ? "font-bold text-sm sm:text-base text-white dark:text-black font-mono"
                                    : "text-xs font-mono"
                                }
                              >
                                {step.id}
                              </span>
                            </button>

                            {/* Step Label beneath Circle */}
                            <span
                              className={`mt-2.5 text-[10px] sm:text-xs font-mono uppercase tracking-wider ${
                                isCurrent
                                  ? "text-[#DC2626] font-bold"
                                  : isCompleted
                                  ? "text-zinc-800 dark:text-zinc-300 font-semibold"
                                  : "text-zinc-400 dark:text-zinc-600 font-medium"
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Step Context Banner */}
                    <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#DC2626] rounded-none inline-block shadow-sm" />
                        <span className="font-bold uppercase tracking-wider text-zinc-950 dark:text-white">
                          Step {currentStep} of 4
                        </span>
                        <span className="text-zinc-400 dark:text-zinc-600">—</span>
                        <span className="text-zinc-600 dark:text-zinc-400 font-sans font-medium">
                          {STEPS[currentStep - 1].description}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 hidden sm:inline-block">
                        2 fields per step
                      </span>
                    </div>
                  </div>

                  {/* ==================================================================
                      FORM FIELDS CONTAINER (Strictly 2 Fields Visible at a Time)
                      ================================================================== */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleNext();
                    }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: direction * 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -direction * 16 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                        className="space-y-5 min-h-[220px]"
                      >
                        {/* ---------------- STEP 1: Company Profile ---------------- */}
                        {currentStep === 1 && (
                          <>
                            {/* Field 1: Company Name */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 font-sans mb-1.5">
                                Company Name <span className="text-[#DC2626]">*</span>
                              </label>
                              <div className="relative">
                                <Building2 className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="text"
                                  value={formData.companyName}
                                  onChange={(e) => handleChange("companyName", e.target.value)}
                                  placeholder="Xtreme Logistics Inc."
                                  className={`w-full pl-10 pr-4 py-3 bg-zinc-50/70 dark:bg-zinc-900/90 border ${
                                    errors.companyName
                                      ? "border-red-500 focus:border-red-500 ring-1 ring-red-500"
                                      : "border-zinc-300 dark:border-zinc-800 focus:border-[#DC2626] dark:focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                                  } rounded-none text-sm sm:text-base text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all font-sans`}
                                />
                              </div>
                              {errors.companyName && (
                                <p className="mt-1 text-xs text-red-500 font-sans font-medium">
                                  {errors.companyName}
                                </p>
                              )}
                            </div>

                            {/* Field 2: Company Website */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 font-sans">
                                  Company Website
                                </label>
                                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-sans">Optional</span>
                              </div>
                              <div className="relative">
                                <Globe className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="text"
                                  value={formData.companyWebsite}
                                  onChange={(e) => handleChange("companyWebsite", e.target.value)}
                                  placeholder="https://yourcompany.com"
                                  className="w-full pl-10 pr-4 py-3 bg-zinc-50/70 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-800 focus:border-[#DC2626] dark:focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] rounded-none text-sm sm:text-base text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all font-sans"
                                />
                              </div>
                            </div>
                          </>
                        )}

                        {/* ---------------- STEP 2: Contact Details ---------------- */}
                        {currentStep === 2 && (
                          <>
                            {/* Field 1: Company Email */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 font-sans mb-1.5">
                                Company Email <span className="text-[#DC2626]">*</span>
                              </label>
                              <div className="relative">
                                <Mail className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="email"
                                  value={formData.companyEmail}
                                  onChange={(e) => handleChange("companyEmail", e.target.value)}
                                  placeholder="info@yourcompany.com"
                                  className={`w-full pl-10 pr-4 py-3 bg-zinc-50/70 dark:bg-zinc-900/90 border ${
                                    errors.companyEmail
                                      ? "border-red-500 focus:border-red-500 ring-1 ring-red-500"
                                      : "border-zinc-300 dark:border-zinc-800 focus:border-[#DC2626] dark:focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                                  } rounded-none text-sm sm:text-base text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all font-sans`}
                                />
                              </div>
                              {errors.companyEmail && (
                                <p className="mt-1 text-xs text-red-500 font-sans font-medium">
                                  {errors.companyEmail}
                                </p>
                              )}
                            </div>

                            {/* Field 2: Phone Number */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 font-sans mb-1.5">
                                Phone Number <span className="text-[#DC2626]">*</span>
                              </label>
                              <div className="relative">
                                <Phone className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="tel"
                                  value={formData.phoneNumber}
                                  onChange={(e) => handleChange("phoneNumber", e.target.value)}
                                  placeholder="+1 (000) 000-0000"
                                  className={`w-full pl-10 pr-4 py-3 bg-zinc-50/70 dark:bg-zinc-900/90 border ${
                                    errors.phoneNumber
                                      ? "border-red-500 focus:border-red-500 ring-1 ring-red-500"
                                      : "border-zinc-300 dark:border-zinc-800 focus:border-[#DC2626] dark:focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                                  } rounded-none text-sm sm:text-base text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all font-sans`}
                                />
                              </div>
                              {errors.phoneNumber && (
                                <p className="mt-1 text-xs text-red-500 font-sans font-medium">
                                  {errors.phoneNumber}
                                </p>
                              )}
                            </div>
                          </>
                        )}

                        {/* ---------------- STEP 3: Fleet Details ---------------- */}
                        {currentStep === 3 && (
                          <>
                            {/* Field 1: Company Address */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 font-sans mb-1.5">
                                Company Address <span className="text-[#DC2626]">*</span>
                              </label>
                              <div className="relative">
                                <MapPin className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="text"
                                  value={formData.companyAddress}
                                  onChange={(e) => handleChange("companyAddress", e.target.value)}
                                  placeholder="123 Main St, City, Province/State"
                                  className={`w-full pl-10 pr-4 py-3 bg-zinc-50/70 dark:bg-zinc-900/90 border ${
                                    errors.companyAddress
                                      ? "border-red-500 focus:border-red-500 ring-1 ring-red-500"
                                      : "border-zinc-300 dark:border-zinc-800 focus:border-[#DC2626] dark:focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                                  } rounded-none text-sm sm:text-base text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all font-sans`}
                                />
                              </div>
                              {errors.companyAddress && (
                                <p className="mt-1 text-xs text-red-500 font-sans font-medium">
                                  {errors.companyAddress}
                                </p>
                              )}
                            </div>

                            {/* Field 2: Number of Vehicles */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 font-sans mb-1.5">
                                Number of Vehicles <span className="text-[#DC2626]">*</span>
                              </label>
                              <div className="relative">
                                <Truck className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="number"
                                  min="1"
                                  value={formData.numberOfVehicles}
                                  onChange={(e) => handleChange("numberOfVehicles", e.target.value)}
                                  placeholder="e.g. 10"
                                  className={`w-full pl-10 pr-4 py-3 bg-zinc-50/70 dark:bg-zinc-900/90 border ${
                                    errors.numberOfVehicles
                                      ? "border-red-500 focus:border-red-500 ring-1 ring-red-500"
                                      : "border-zinc-300 dark:border-zinc-800 focus:border-[#DC2626] dark:focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                                  } rounded-none text-sm sm:text-base text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all font-sans`}
                                />
                              </div>
                              {errors.numberOfVehicles && (
                                <p className="mt-1 text-xs text-red-500 font-sans font-medium">
                                  {errors.numberOfVehicles}
                                </p>
                              )}
                            </div>
                          </>
                        )}

                        {/* ---------------- STEP 4: Password Setup ---------------- */}
                        {currentStep === 4 && (
                          <>
                            {/* Field 1: Password */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 font-sans mb-1.5">
                                Password <span className="text-[#DC2626]">*</span>
                              </label>
                              <div className="relative">
                                <Lock className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="password"
                                  value={formData.password}
                                  onChange={(e) => handleChange("password", e.target.value)}
                                  placeholder="Create a password"
                                  className={`w-full pl-10 pr-4 py-3 bg-zinc-50/70 dark:bg-zinc-900/90 border ${
                                    errors.password
                                      ? "border-red-500 focus:border-red-500 ring-1 ring-red-500"
                                      : "border-zinc-300 dark:border-zinc-800 focus:border-[#DC2626] dark:focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                                  } rounded-none text-sm sm:text-base text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all font-sans`}
                                />
                              </div>
                              {errors.password && (
                                <p className="mt-1 text-xs text-red-500 font-sans font-medium">
                                  {errors.password}
                                </p>
                              )}
                            </div>

                            {/* Field 2: Confirm Password */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 font-sans mb-1.5">
                                Confirm Password <span className="text-[#DC2626]">*</span>
                              </label>
                              <div className="relative">
                                <Lock className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="password"
                                  value={formData.confirmPassword}
                                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                                  placeholder="Repeat your password"
                                  className={`w-full pl-10 pr-4 py-3 bg-zinc-50/70 dark:bg-zinc-900/90 border ${
                                    errors.confirmPassword
                                      ? "border-red-500 focus:border-red-500 ring-1 ring-red-500"
                                      : "border-zinc-300 dark:border-zinc-800 focus:border-[#DC2626] dark:focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                                  } rounded-none text-sm sm:text-base text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all font-sans`}
                                />
                              </div>
                              {errors.confirmPassword && (
                                <p className="mt-1 text-xs text-red-500 font-sans font-medium">
                                  {errors.confirmPassword}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </motion.div>
                    </AnimatePresence>

                    {/* ==================================================================
                        ACTION BUTTONS (Bottom-Right "Next" Button matching Wireframe)
                        ================================================================== */}
                    <div className="flex items-center justify-between pt-6 mt-6 border-t border-zinc-200 dark:border-zinc-800">
                      {currentStep > 1 ? (
                        <button
                          type="button"
                          onClick={handleBack}
                          className="inline-flex items-center gap-2 px-5 py-3 rounded-none border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-sm font-medium transition-colors cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Back</span>
                        </button>
                      ) : (
                        <div /> /* Empty space to push Next to right */
                      )}

                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2.5 px-8 sm:px-10 py-3.5 rounded-none bg-zinc-950 text-white dark:bg-white dark:text-black hover:bg-[#DC2626] dark:hover:bg-[#DC2626] dark:hover:text-white font-medium text-sm sm:text-base tracking-tight transition-all duration-200 shadow-sm active:scale-98 cursor-pointer"
                      >
                        <span>{currentStep === 4 ? "Submit Account" : "Next"}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* ==================================================================
                    SUCCESS CONFIRMATION STATE
                    ================================================================== */
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-6 sm:py-8 space-y-6"
                >
                  <div className="w-16 h-16 mx-auto rounded-none bg-zinc-950 dark:bg-white text-white dark:text-black flex items-center justify-center shadow-md">
                    <CheckCircle2 className="w-9 h-9 text-[#DC2626]" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white">
                      Fleet Account Submitted!
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 font-sans max-w-md mx-auto">
                      Thank you, <span className="font-semibold text-zinc-900 dark:text-white">{formData.companyName}</span>.
                      Your commercial application has been approved. A dedicated Fleet Account Code has been emailed to{" "}
                      <span className="font-semibold text-zinc-900 dark:text-white">{formData.companyEmail}</span>.
                    </p>
                  </div>

                  {/* Summary Box */}
                  <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 text-left space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-zinc-500">
                      <span>STATUS:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">APPROVED AND READY</span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>VEHICLES REGISTERED:</span>
                      <span className="text-zinc-900 dark:text-white font-bold">{formData.numberOfVehicles} units</span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>PRIMARY PHONE:</span>
                      <span className="text-zinc-900 dark:text-white font-bold">{formData.phoneNumber}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href={LOGIN_URL}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-none bg-zinc-950 text-white dark:bg-white dark:text-black hover:bg-[#DC2626] dark:hover:bg-[#DC2626] dark:hover:text-white font-medium text-sm transition-colors cursor-pointer"
                    >
                      Sign In to Fleet Portal
                    </a>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-none border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium transition-colors cursor-pointer"
                    >
                      Register Another Fleet
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
