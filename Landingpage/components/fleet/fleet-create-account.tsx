"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LOGIN_URL, API_BASE_URL } from "@/lib/config";
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
  Eye,
  EyeOff,
  User,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface FormData {
  name: string;
  countryCode: "CA" | "US" | "UK";
  website: string;
  contactPerson: string;
  phone: string;
  fleetManager: string;
  altPhone: string;
  address: string;
  numberOfUnits: string;
  poaEmail: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  [key: string]: string;
}

const INITIAL_DATA: FormData = {
  name: "",
  countryCode: "CA",
  website: "",
  contactPerson: "",
  phone: "",
  fleetManager: "",
  altPhone: "",
  address: "",
  numberOfUnits: "",
  poaEmail: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const STEPS = [
  { id: 1, label: "Company", description: "Company profile & operating region" },
  { id: 2, label: "Contact", description: "Primary contact & dispatch phone" },
  { id: 3, label: "Fleet", description: "Depot address & commercial units" },
  { id: 4, label: "Access", description: "Manager portal email & password" },
];

export default function FleetCreateAccount() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_DATA);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedFleet, setSubmittedFleet] = useState<any | null>(null);
  const [direction, setDirection] = useState<number>(1);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

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
      if (!formData.name.trim()) {
        newErrors.name = "Company Legal Name is required.";
      }
      if (!formData.countryCode) {
        newErrors.countryCode = "Operating Country is required.";
      }
    } else if (step === 2) {
      if (!formData.contactPerson.trim()) {
        newErrors.contactPerson = "Primary Contact Person is required.";
      }
      if (!formData.phone.trim()) {
        newErrors.phone = "Phone Number is required.";
      }
    } else if (step === 3) {
      if (!formData.address.trim()) {
        newErrors.address = "Operating / Depot Address is required.";
      }
      if (!formData.numberOfUnits.trim()) {
        newErrors.numberOfUnits = "Number of vehicles is required.";
      } else if (isNaN(Number(formData.numberOfUnits)) || Number(formData.numberOfUnits) < 1) {
        newErrors.numberOfUnits = "Please enter a valid number of units (1 or more).";
      }

      if (formData.poaEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.poaEmail.trim())) {
        newErrors.poaEmail = "Please enter a valid billing email address.";
      }
    } else if (step === 4) {
      if (!formData.email.trim()) {
        newErrors.email = "Portal Login Email is required.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        newErrors.email = "Please enter a valid email address.";
      }

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

  const submitFleetRegistration = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        countryCode: formData.countryCode,
        website: formData.website.trim() || undefined,
        contactPerson: formData.contactPerson.trim(),
        phone: formData.phone.trim(),
        fleetManager: formData.fleetManager.trim() || undefined,
        altPhone: formData.altPhone.trim() || undefined,
        address: formData.address.trim(),
        numberOfUnits: Number(formData.numberOfUnits),
        poaEmail: formData.poaEmail.trim() || undefined,
        email: formData.email.trim(),
        password: formData.password,
      };

      const response = await fetch(`${API_BASE_URL}/fleets/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg =
          data?.message ||
          (Array.isArray(data?.errors)
            ? data.errors.map((e: any) => e.message).join(", ")
            : null) ||
          "Failed to submit fleet registration. Please check your details and try again.";
        setSubmitError(errorMsg);
        setIsSubmitting(false);
        return;
      }

      const createdFleet = data?.data || data;
      setSubmittedFleet(createdFleet);
      setIsSubmitted(true);
    } catch (err: any) {
      setSubmitError(
        err?.message || "Network error connecting to registration server. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;

    if (currentStep < 4) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    } else {
      submitFleetRegistration();
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
    setSubmittedFleet(null);
    setSubmitError(null);
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
              src="https://res.cloudinary.com/ebjikx52/image/upload/v1792773487/xtreme/landing/fleet-black-sports-car_jpg.jpg"
              alt="Performance Automotive Sports Car"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />

            {/* Subtle soft tint */}
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
                    </div>
                  </div>

                  {/* Inline Error Banner */}
                  {submitError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 p-4 bg-red-950/70 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-start gap-3 shadow-lg"
                    >
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold text-red-200 block">Registration Error</span>
                        <span className="font-sans leading-relaxed text-zinc-300">{submitError}</span>
                      </div>
                    </motion.div>
                  )}

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
                        className="space-y-4 min-h-[220px]"
                      >
                        {/* ---------------- STEP 1: Company Profile ---------------- */}
                        {currentStep === 1 && (
                          <>
                            {/* Field 1: Company Legal Name */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-zinc-300 font-sans mb-1.5">
                                Company Legal Name <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <Building2 className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="text"
                                  value={formData.name}
                                  onChange={(e) => handleChange("name", e.target.value)}
                                  placeholder="e.g. Apex Transportation Logistics Inc."
                                  className={`w-full pl-10 pr-4 py-3 bg-white/[0.04] border ${
                                    errors.name
                                      ? "border-red-500 ring-1 ring-red-500"
                                      : "border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                  } rounded-xl text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:bg-white/[0.07] transition-all font-sans`}
                                />
                              </div>
                              {errors.name && (
                                <p className="mt-1 text-xs text-red-400 font-sans font-medium">
                                  {errors.name}
                                </p>
                              )}
                            </div>

                            {/* Field 2: Country / Regional Operating Silo */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-zinc-300 font-sans mb-1.5">
                                Operating Region / Country <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <Globe className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <select
                                  value={formData.countryCode}
                                  onChange={(e) =>
                                    handleChange("countryCode", e.target.value as "CA" | "US" | "UK")
                                  }
                                  className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl text-sm sm:text-base text-white focus:outline-none transition-all font-sans appearance-none cursor-pointer"
                                >
                                  <option value="CA" className="bg-zinc-900 text-white">
                                    Canada (CA) — CAD Billing
                                  </option>
                                  <option value="US" className="bg-zinc-900 text-white">
                                    United States (US) — USD Billing
                                  </option>
                                  <option value="UK" className="bg-zinc-900 text-white">
                                    United Kingdom (UK) — GBP Billing
                                  </option>
                                </select>
                              </div>
                              {errors.countryCode && (
                                <p className="mt-1 text-xs text-red-400 font-sans font-medium">
                                  {errors.countryCode}
                                </p>
                              )}
                            </div>

                            {/* Field 3: Company Website */}
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
                                  value={formData.website}
                                  onChange={(e) => handleChange("website", e.target.value)}
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
                            {/* Field 1: Contact Person */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-zinc-300 font-sans mb-1.5">
                                Primary Contact Person <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="text"
                                  value={formData.contactPerson}
                                  onChange={(e) => handleChange("contactPerson", e.target.value)}
                                  placeholder="Full name (e.g. John Doe)"
                                  className={`w-full pl-10 pr-4 py-3 bg-white/[0.04] border ${
                                    errors.contactPerson
                                      ? "border-red-500 ring-1 ring-red-500"
                                      : "border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                  } rounded-xl text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:bg-white/[0.07] transition-all font-sans`}
                                />
                              </div>
                              {errors.contactPerson && (
                                <p className="mt-1 text-xs text-red-400 font-sans font-medium">
                                  {errors.contactPerson}
                                </p>
                              )}
                            </div>

                            {/* Field 2: Dispatch Phone Number */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-zinc-300 font-sans mb-1.5">
                                Dispatch Phone Number <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="tel"
                                  value={formData.phone}
                                  onChange={(e) => handleChange("phone", e.target.value)}
                                  placeholder={
                                    formData.countryCode === "UK"
                                      ? "+44 20 7946 0000"
                                      : "+1 (555) 000-0000"
                                  }
                                  className={`w-full pl-10 pr-4 py-3 bg-white/[0.04] border ${
                                    errors.phone
                                      ? "border-red-500 ring-1 ring-red-500"
                                      : "border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                  } rounded-xl text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:bg-white/[0.07] transition-all font-sans`}
                                />
                              </div>
                              {errors.phone && (
                                <p className="mt-1 text-xs text-red-400 font-sans font-medium">
                                  {errors.phone}
                                </p>
                              )}
                            </div>

                            {/* Field 3: Fleet Manager (Optional) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-zinc-400 font-sans mb-1">
                                  Fleet Manager Name <span className="text-zinc-600">(Optional)</span>
                                </label>
                                <input
                                  type="text"
                                  value={formData.fleetManager}
                                  onChange={(e) => handleChange("fleetManager", e.target.value)}
                                  placeholder="e.g. Alex Smith"
                                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:bg-white/[0.07] transition-all font-sans"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-zinc-400 font-sans mb-1">
                                  Alt / Emergency Phone <span className="text-zinc-600">(Optional)</span>
                                </label>
                                <input
                                  type="tel"
                                  value={formData.altPhone}
                                  onChange={(e) => handleChange("altPhone", e.target.value)}
                                  placeholder="Secondary contact"
                                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:bg-white/[0.07] transition-all font-sans"
                                />
                              </div>
                            </div>
                          </>
                        )}

                        {/* ---------------- STEP 3: Fleet & Operating Details ---------------- */}
                        {currentStep === 3 && (
                          <>
                            {/* Field 1: Operating / Depot Address */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-zinc-300 font-sans mb-1.5">
                                Operating / Depot Address <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <MapPin className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="text"
                                  value={formData.address}
                                  onChange={(e) => handleChange("address", e.target.value)}
                                  placeholder="123 Industrial Way, City, Province/State, Postal"
                                  className={`w-full pl-10 pr-4 py-3 bg-white/[0.04] border ${
                                    errors.address
                                      ? "border-red-500 ring-1 ring-red-500"
                                      : "border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                  } rounded-xl text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:bg-white/[0.07] transition-all font-sans`}
                                />
                              </div>
                              {errors.address && (
                                <p className="mt-1 text-xs text-red-400 font-sans font-medium">
                                  {errors.address}
                                </p>
                              )}
                            </div>

                            {/* Field 2: Number of Vehicles */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-zinc-300 font-sans mb-1.5">
                                Number of Commercial Units <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <Truck className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="number"
                                  min="1"
                                  value={formData.numberOfUnits}
                                  onChange={(e) => handleChange("numberOfUnits", e.target.value)}
                                  placeholder="e.g. 10"
                                  className={`w-full pl-10 pr-4 py-3 bg-white/[0.04] border ${
                                    errors.numberOfUnits
                                      ? "border-red-500 ring-1 ring-red-500"
                                      : "border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                  } rounded-xl text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:bg-white/[0.07] transition-all font-sans`}
                                />
                              </div>
                              {errors.numberOfUnits && (
                                <p className="mt-1 text-xs text-red-400 font-sans font-medium">
                                  {errors.numberOfUnits}
                                </p>
                              )}
                            </div>

                            {/* Field 3: Accounts Payable / POA Email */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs sm:text-sm font-medium text-zinc-300 font-sans">
                                  Billing / Accounts Payable Email
                                </label>
                                <span className="text-[11px] text-zinc-500 font-sans">Optional</span>
                              </div>
                              <div className="relative">
                                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="email"
                                  value={formData.poaEmail}
                                  onChange={(e) => handleChange("poaEmail", e.target.value)}
                                  placeholder="ap@yourcompany.com (For Net-30 Invoices)"
                                  className={`w-full pl-10 pr-4 py-3 bg-white/[0.04] border ${
                                    errors.poaEmail
                                      ? "border-red-500 ring-1 ring-red-500"
                                      : "border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                  } rounded-xl text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:bg-white/[0.07] transition-all font-sans`}
                                />
                              </div>
                              {errors.poaEmail && (
                                <p className="mt-1 text-xs text-red-400 font-sans font-medium">
                                  {errors.poaEmail}
                                </p>
                              )}
                            </div>
                          </>
                        )}

                        {/* ---------------- STEP 4: Portal Login & Security ---------------- */}
                        {currentStep === 4 && (
                          <>
                            {/* Field 1: Portal Login Email */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-zinc-300 font-sans mb-1.5">
                                Fleet Portal Login Email <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="email"
                                  value={formData.email}
                                  onChange={(e) => handleChange("email", e.target.value)}
                                  placeholder="manager@yourcompany.com"
                                  className={`w-full pl-10 pr-4 py-3 bg-white/[0.04] border ${
                                    errors.email
                                      ? "border-red-500 ring-1 ring-red-500"
                                      : "border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                  } rounded-xl text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:bg-white/[0.07] transition-all font-sans`}
                                />
                              </div>
                              {errors.email && (
                                <p className="mt-1 text-xs text-red-400 font-sans font-medium">
                                  {errors.email}
                                </p>
                              )}
                            </div>

                            {/* Field 2: Password */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-zinc-300 font-sans mb-1.5">
                                Set Password <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type={showPassword ? "text" : "password"}
                                  value={formData.password}
                                  onChange={(e) => handleChange("password", e.target.value)}
                                  placeholder="At least 6 characters"
                                  className={`w-full pl-10 pr-11 py-3 bg-white/[0.04] border ${
                                    errors.password
                                      ? "border-red-500 ring-1 ring-red-500"
                                      : "border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                  } rounded-xl text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:bg-white/[0.07] transition-all font-sans`}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 focus:outline-none cursor-pointer p-1"
                                  aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                  {showPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                              {errors.password && (
                                <p className="mt-1 text-xs text-red-400 font-sans font-medium">
                                  {errors.password}
                                </p>
                              )}
                            </div>

                            {/* Field 3: Confirm Password */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-zinc-300 font-sans mb-1.5">
                                Confirm Password <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type={showConfirmPassword ? "text" : "password"}
                                  value={formData.confirmPassword}
                                  onChange={(e) =>
                                    handleChange("confirmPassword", e.target.value)
                                  }
                                  placeholder="Repeat password"
                                  className={`w-full pl-10 pr-11 py-3 bg-white/[0.04] border ${
                                    errors.confirmPassword
                                      ? "border-red-500 ring-1 ring-red-500"
                                      : "border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                  } rounded-xl text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:bg-white/[0.07] transition-all font-sans`}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 focus:outline-none cursor-pointer p-1"
                                  aria-label={
                                    showConfirmPassword ? "Hide password" : "Show password"
                                  }
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </button>
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
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/30 text-zinc-300 hover:text-white text-xs sm:text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Back</span>
                        </button>
                      ) : (
                        <div />
                      )}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center gap-2.5 px-8 sm:px-10 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-red-600/30 hover:shadow-red-600/50 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Submitting Application...</span>
                          </>
                        ) : (
                          <>
                            <span>
                              {currentStep === 4 ? "Submit Fleet Account" : "Next Step"}
                            </span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* ==================================================================
                    SUCCESS CONFIRMATION STATE (Pending Approval & Real Fleet Code)
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
                    <h3 className="text-2xl sm:text-3xl font-bold text-white font-sans">
                      Fleet Account Submitted!
                    </h3>
                    <p className="text-sm text-zinc-400 font-sans max-w-md mx-auto">
                      Thank you,{" "}
                      <span className="font-semibold text-white">
                        {submittedFleet?.name || formData.name}
                      </span>
                      . Your commercial application has been submitted and is currently pending review by our operations team. A confirmation has been sent to{" "}
                      <span className="font-semibold text-white">
                        {submittedFleet?.email || formData.email}
                      </span>
                      .
                    </p>
                  </div>

                  {/* Summary Box */}
                  <div className="border border-white/10 bg-white/[0.03] rounded-xl p-4 text-left space-y-2.5 text-xs font-mono">
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>STATUS:</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        PENDING APPROVAL
                      </span>
                    </div>
                    {submittedFleet?.fleetCode && (
                      <div className="flex justify-between items-center text-zinc-400">
                        <span>FLEET CODE:</span>
                        <span className="text-white font-bold">{submittedFleet.fleetCode}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>UNITS REGISTERED:</span>
                      <span className="text-white font-bold">
                        {submittedFleet?.numberOfUnits || formData.numberOfUnits} units
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>DISPATCH PHONE:</span>
                      <span className="text-white font-bold">
                        {submittedFleet?.phone || formData.phone}
                      </span>
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
