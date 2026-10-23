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
  { id: 1, label: "Company", description: "Company profile & website" },
  { id: 2, label: "Contact", description: "Email & phone details" },
  { id: 3, label: "Fleet", description: "Operating address & units" },
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
      data-hide-navbar="true"
      className="w-full pt-8 sm:pt-12 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
    >
      {/* Outer Luxury Automotive Container */}
      <div className="relative border border-zinc-800/80 bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px] lg:min-h-[640px]">
          {/* ========================================================================
              LEFT COLUMN: High-Resolution Sports Car Background with Centered Title
              ======================================================================== */}
          <div className="lg:col-span-5 xl:col-span-6 relative min-h-[380px] sm:min-h-[440px] lg:min-h-full flex items-center justify-center p-6 sm:p-10 text-center overflow-hidden">
            {/* High-Resolution Performance Sports Car Photo */}
            <img
              src="/fleet-sports-car-bg.jpg"
              alt="Performance Automotive Sports Car"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />

            {/* Subtle soft tint (leaves car body, wheels and tyres clearly visible) */}
            <div className="absolute inset-0 bg-black/25 pointer-events-none" />

            {/* Centered Heading in the exact middle of the picture */}
            <div className="relative z-10 w-full max-w-lg mx-auto text-center px-4 flex flex-col items-center justify-center">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[46px] font-extrabold uppercase tracking-tight text-white font-sans drop-shadow-[0_4px_32px_rgba(0,0,0,0.95)] leading-[1.12]">
                Create Your
                <br />
                Fleet Account
              </h2>
            </div>
          </div>

          {/* ========================================================================
              RIGHT COLUMN: High-End Obsidian Dark Glass Interactive Onboarding Form
              ======================================================================== */}
          <div className="lg:col-span-7 xl:col-span-6 p-6 sm:p-10 lg:p-12 flex items-center justify-center bg-black/95 backdrop-blur-2xl border-t lg:border-t-0 lg:border-l border-white/10">
            <div className="w-full max-w-xl">
              {!isSubmitted ? (
                <div>
                  {/* ==================================================================
                      STEP PROGRESS INDICATOR (Sleek Connected Step Rings)
                      ================================================================== */}
                  <div className="relative mb-8 sm:mb-10">
                    <div className="flex items-center justify-between relative">
                      {/* Background Connector Bar */}
                      <div className="absolute top-5 left-5 right-5 h-[2px] bg-zinc-800 z-0">
                        {/* Glowing Active Fill */}
                        <div
                          className="h-full bg-gradient-to-r from-red-600 via-rose-600 to-red-500 transition-all duration-300 shadow-[0_0_12px_rgba(220,38,38,0.6)]"
                          style={{
                            width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
                          }}
                        />
                      </div>

                      {/* 4 Connected Circular Step Badges */}
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
                              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-mono text-xs sm:text-sm transition-all duration-300 ${
                                isCompleted
                                  ? "bg-zinc-800 text-white border border-zinc-700 shadow-md cursor-pointer hover:border-red-500 hover:text-red-400"
                                  : isCurrent
                                  ? "bg-gradient-to-br from-red-600 to-rose-700 text-white border-2 border-red-500 shadow-[0_0_24px_rgba(220,38,38,0.5)] ring-4 ring-red-500/20 font-bold"
                                  : "bg-zinc-900/80 text-zinc-500 border border-white/5 cursor-not-allowed font-medium"
                              }`}
                              title={step.label}
                            >
                              {isCompleted ? (
                                <Check className="w-4 h-4 stroke-[2.5]" />
                              ) : (
                                <span>{step.id}</span>
                              )}
                            </button>

                            {/* Step Title Label */}
                            <span
                              className={`mt-2 text-[10px] sm:text-xs font-mono uppercase tracking-wider transition-colors ${
                                isCurrent
                                  ? "text-red-500 font-bold"
                                  : isCompleted
                                  ? "text-zinc-300 font-medium"
                                  : "text-zinc-600"
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Step Context Sub-bar */}
                    <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
                        <span className="font-bold uppercase tracking-wider text-white">
                          Step {currentStep} of 4
                        </span>
                        <span className="text-zinc-600">—</span>
                        <span className="text-zinc-400 font-sans font-medium">
                          {STEPS[currentStep - 1].description}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline-block">
                        2 fields per step
                      </span>
                    </div>
                  </div>

                  {/* ==================================================================
                      FORM FIELDS CONTAINER
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
                        className="space-y-4 min-h-[200px]"
                      >
                        {/* ---------------- STEP 1: Company Profile ---------------- */}
                        {currentStep === 1 && (
                          <>
                            {/* Field 1: Company Name */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-zinc-300 font-sans mb-1.5">
                                Company Name <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <Building2 className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="text"
                                  value={formData.companyName}
                                  onChange={(e) => handleChange("companyName", e.target.value)}
                                  placeholder="e.g. Xtreme Logistics Inc."
                                  className={`w-full pl-10 pr-4 py-3 bg-white/[0.04] border ${
                                    errors.companyName
                                      ? "border-red-500 ring-1 ring-red-500"
                                      : "border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                  } rounded-xl text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:bg-white/[0.07] transition-all font-sans`}
                                />
                              </div>
                              {errors.companyName && (
                                <p className="mt-1 text-xs text-red-400 font-sans font-medium">
                                  {errors.companyName}
                                </p>
                              )}
                            </div>

                            {/* Field 2: Company Website */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs sm:text-sm font-medium text-zinc-300 font-sans">
                                  Company Website
                                </label>
                                <span className="text-[11px] text-zinc-500 font-sans">Optional</span>
                              </div>
                              <div className="relative">
                                <Globe className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="text"
                                  value={formData.companyWebsite}
                                  onChange={(e) => handleChange("companyWebsite", e.target.value)}
                                  placeholder="https://yourcompany.com"
                                  className="w-full pl-10 pr-4 py-3 bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:bg-white/[0.07] transition-all font-sans"
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
                              <label className="block text-xs sm:text-sm font-medium text-zinc-300 font-sans mb-1.5">
                                Company Email <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="email"
                                  value={formData.companyEmail}
                                  onChange={(e) => handleChange("companyEmail", e.target.value)}
                                  placeholder="info@yourcompany.com"
                                  className={`w-full pl-10 pr-4 py-3 bg-white/[0.04] border ${
                                    errors.companyEmail
                                      ? "border-red-500 ring-1 ring-red-500"
                                      : "border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                  } rounded-xl text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:bg-white/[0.07] transition-all font-sans`}
                                />
                              </div>
                              {errors.companyEmail && (
                                <p className="mt-1 text-xs text-red-400 font-sans font-medium">
                                  {errors.companyEmail}
                                </p>
                              )}
                            </div>

                            {/* Field 2: Phone Number */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-zinc-300 font-sans mb-1.5">
                                Phone Number <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="tel"
                                  value={formData.phoneNumber}
                                  onChange={(e) => handleChange("phoneNumber", e.target.value)}
                                  placeholder="+1 (000) 000-0000"
                                  className={`w-full pl-10 pr-4 py-3 bg-white/[0.04] border ${
                                    errors.phoneNumber
                                      ? "border-red-500 ring-1 ring-red-500"
                                      : "border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                  } rounded-xl text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:bg-white/[0.07] transition-all font-sans`}
                                />
                              </div>
                              {errors.phoneNumber && (
                                <p className="mt-1 text-xs text-red-400 font-sans font-medium">
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
                              <label className="block text-xs sm:text-sm font-medium text-zinc-300 font-sans mb-1.5">
                                Company Address <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <MapPin className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="text"
                                  value={formData.companyAddress}
                                  onChange={(e) => handleChange("companyAddress", e.target.value)}
                                  placeholder="123 Main St, City, Province/State"
                                  className={`w-full pl-10 pr-4 py-3 bg-white/[0.04] border ${
                                    errors.companyAddress
                                      ? "border-red-500 ring-1 ring-red-500"
                                      : "border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                  } rounded-xl text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:bg-white/[0.07] transition-all font-sans`}
                                />
                              </div>
                              {errors.companyAddress && (
                                <p className="mt-1 text-xs text-red-400 font-sans font-medium">
                                  {errors.companyAddress}
                                </p>
                              )}
                            </div>

                            {/* Field 2: Number of Vehicles */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-zinc-300 font-sans mb-1.5">
                                Number of Commercial Vehicles <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <Truck className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="number"
                                  min="1"
                                  value={formData.numberOfVehicles}
                                  onChange={(e) => handleChange("numberOfVehicles", e.target.value)}
                                  placeholder="e.g. 10"
                                  className={`w-full pl-10 pr-4 py-3 bg-white/[0.04] border ${
                                    errors.numberOfVehicles
                                      ? "border-red-500 ring-1 ring-red-500"
                                      : "border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                  } rounded-xl text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:bg-white/[0.07] transition-all font-sans`}
                                />
                              </div>
                              {errors.numberOfVehicles && (
                                <p className="mt-1 text-xs text-red-400 font-sans font-medium">
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
                              <label className="block text-xs sm:text-sm font-medium text-zinc-300 font-sans mb-1.5">
                                Set Password <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="password"
                                  value={formData.password}
                                  onChange={(e) => handleChange("password", e.target.value)}
                                  placeholder="At least 6 characters"
                                  className={`w-full pl-10 pr-4 py-3 bg-white/[0.04] border ${
                                    errors.password
                                      ? "border-red-500 ring-1 ring-red-500"
                                      : "border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                  } rounded-xl text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:bg-white/[0.07] transition-all font-sans`}
                                />
                              </div>
                              {errors.password && (
                                <p className="mt-1 text-xs text-red-400 font-sans font-medium">
                                  {errors.password}
                                </p>
                              )}
                            </div>

                            {/* Field 2: Confirm Password */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-zinc-300 font-sans mb-1.5">
                                Confirm Password <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="password"
                                  value={formData.confirmPassword}
                                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                                  placeholder="Repeat password"
                                  className={`w-full pl-10 pr-4 py-3 bg-white/[0.04] border ${
                                    errors.confirmPassword
                                      ? "border-red-500 ring-1 ring-red-500"
                                      : "border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                  } rounded-xl text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:bg-white/[0.07] transition-all font-sans`}
                                />
                              </div>
                              {errors.confirmPassword && (
                                <p className="mt-1 text-xs text-red-400 font-sans font-medium">
                                  {errors.confirmPassword}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </motion.div>
                    </AnimatePresence>

                    {/* ==================================================================
                        ACTION BUTTONS
                        ================================================================== */}
                    <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/10">
                      {currentStep > 1 ? (
                        <button
                          type="button"
                          onClick={handleBack}
                          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/30 text-zinc-300 hover:text-white text-xs sm:text-sm font-medium transition-all cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Back</span>
                        </button>
                      ) : (
                        <div />
                      )}

                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2.5 px-8 sm:px-10 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-red-600/30 hover:shadow-red-600/50 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <span>{currentStep === 4 ? "Submit Fleet Account" : "Next Step"}</span>
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
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center shadow-xl shadow-red-600/30">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl sm:text-3xl font-bold text-white">
                      Fleet Account Submitted!
                    </h3>
                    <p className="text-sm text-zinc-400 font-sans max-w-md mx-auto">
                      Thank you, <span className="font-semibold text-white">{formData.companyName}</span>.
                      Your commercial application has been processed. A dedicated Fleet Account Code has been emailed to{" "}
                      <span className="font-semibold text-white">{formData.companyEmail}</span>.
                    </p>
                  </div>

                  {/* Summary Box */}
                  <div className="border border-white/10 bg-white/[0.03] rounded-xl p-4 text-left space-y-2.5 text-xs font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>STATUS:</span>
                      <span className="text-emerald-400 font-bold">APPROVED &amp; ACTIVE</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>UNITS REGISTERED:</span>
                      <span className="text-white font-bold">{formData.numberOfVehicles} units</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>DISPATCH PHONE:</span>
                      <span className="text-white font-bold">{formData.phoneNumber}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href={LOGIN_URL}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-600/30 cursor-pointer"
                    >
                      Sign In to Fleet Portal
                    </a>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
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
