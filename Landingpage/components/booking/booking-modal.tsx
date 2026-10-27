"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Wrench,
  Clock,
  MapPin,
  CheckCircle2,
  Calendar as CalendarIcon,
  Car,
  AlertCircle,
  Loader2,
  Zap,
  RotateCw,
  Disc3,
  Droplets,
  Sparkles,
} from "lucide-react";


export interface BookingCategoryOption {
  id: string;
  name: string;
  code: string;
  icon: React.ComponentType<{ className?: string }>;
  services: string[];
}

export const BOOKING_SERVICE_CATEGORIES: BookingCategoryOption[] = [
  {
    id: "tire-services",
    name: "Tire Services",
    code: "TIRE_SERVICE",
    icon: RotateCw,
    services: [
      "Seasonal Tire Change (ON/OFF RIM)",
      "Flat Tire Repair",
      "New Tires for Sale",
      "Used Tires for Sale",
      "Tire Storage",
    ],
  },
  {
    id: "wheel-rim-services",
    name: "Wheel & Rim Services",
    code: "WHEEL_RIM_SERVICE",
    icon: Disc3,
    services: [
      "Rim Repair",
      "Rim Protector Installation",
    ],
  },
  {
    id: "mobile-auto-maintenance",
    name: "Mobile Auto Maintenance",
    code: "AUTO_MAINTENANCE",
    icon: Droplets,
    services: [
      "Oil Change",
      "Brake Replacement",
      "Battery Boost / Jump-Start",
    ],
  },
  {
    id: "roadside-assistance",
    name: "Roadside Assistance",
    code: "ROADSIDE_ASSISTANCE",
    icon: Clock,
    services: [
      "Roadside Assistance (24/7)",
      "Car Lockout / Locksmith",
      "Gas and Diesel Delivery",
    ],
  },
  {
    id: "vehicle-care-protection",
    name: "Vehicle Care & Protection",
    code: "VEHICLE_CARE",
    icon: Sparkles,
    services: [
      "Car Detailing",
      "PPF (Paint Protection Film)",
    ],
  },
];

export function findCategoryForService(title: string): BookingCategoryOption {
  for (const cat of BOOKING_SERVICE_CATEGORIES) {
    if (cat.services.includes(title)) {
      return cat;
    }
  }
  return BOOKING_SERVICE_CATEGORIES[0];
}

export interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialServiceTitle?: string;
  initialServiceCategory?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.xtrememobiletire.com/api";

const TIMEZONES = [
  { label: "Canada – Toronto (EDT/EST)", value: "America/Toronto" },
  { label: "Canada – Vancouver (PDT/PST)", value: "America/Vancouver" },
  { label: "US – New York / Eastern", value: "America/New_York" },
  { label: "US – Chicago / Central", value: "America/Chicago" },
  { label: "US – Los Angeles / Pacific", value: "America/Los_Angeles" },
  { label: "UK – London (GMT/BST)", value: "Europe/London" },
];

const POPULAR_MAKES = [
  "Ford",
  "Toyota",
  "Chevrolet",
  "Honda",
  "Ram",
  "GMC",
  "BMW",
  "Mercedes-Benz",
  "Nissan",
  "Hyundai",
  "Tesla",
];

// 24/7 Pre-computed time slot periods
const TIME_SLOTS_24_7 = {
  morning: [
    "06:00 AM",
    "07:30 AM",
    "08:30 AM",
    "09:30 AM",
    "10:30 AM",
    "11:30 AM",
  ],
  afternoon: [
    "12:30 PM",
    "01:30 PM",
    "02:30 PM",
    "03:30 PM",
    "04:30 PM",
  ],
  evening: [
    "05:30 PM",
    "06:30 PM",
    "07:30 PM",
    "08:30 PM",
    "09:30 PM",
  ],
  overnight: [
    "10:30 PM",
    "11:30 PM",
    "01:00 AM",
    "02:30 AM",
    "04:00 AM",
  ],
};

const DAYS_OF_WEEK = ["M", "T", "W", "T", "F", "S", "S"];

export default function BookingModal({
  isOpen,
  onClose,
  initialServiceTitle = "Flat Tire Repair",
  initialServiceCategory = "TIRE_SERVICE",
}: BookingModalProps) {
  // Step 1: Select a time, Step 2: Your Details, Step 3: Confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Service Selection & Dropdown State
  const [serviceTitle, setServiceTitle] = useState<string>(initialServiceTitle);
  const [serviceCategory, setServiceCategory] = useState<string>(initialServiceCategory);
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState<boolean>(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>(() => {
    const found = BOOKING_SERVICE_CATEGORIES.find((cat) => cat.services.includes(initialServiceTitle));
    return found ? found.id : "tire-services";
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync initialServiceTitle when modal opens or prop changes
  useEffect(() => {
    if (isOpen && initialServiceTitle) {
      setServiceTitle(initialServiceTitle);
      const found = BOOKING_SERVICE_CATEGORIES.find((cat) => cat.services.includes(initialServiceTitle));
      if (found) {
        setActiveCategoryTab(found.id);
        setServiceCategory(found.code);
      }
    }
  }, [isOpen, initialServiceTitle]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsServiceDropdownOpen(false);
      }
    };
    if (isServiceDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isServiceDropdownOpen]);

  // Step 1: Calendar & Time State
  const [currentMonth, setCurrentMonth] = useState<Date>(
    () => new Date(2026, 9, 1)
  );
  const [selectedDate, setSelectedDate] = useState<Date>(
    () => new Date(2026, 9, 27)
  );
  const [todayStartMs, setTodayStartMs] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("01:30 PM");
  const [selectedTimezone, setSelectedTimezone] = useState<string>("America/Toronto");
  const [timeCategory, setTimeCategory] = useState<"morning" | "afternoon" | "evening" | "overnight">("afternoon");
  const [customTime, setCustomTime] = useState<string>("");
  const [isCustomTime, setIsCustomTime] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // Mount tracking for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and blur background cleanly when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Step 2: Vehicle & Customer Details State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    year: "2026",
    make: "",
    model: "",
    trim: "",
    address: "",
    notes: "",
  });

  // Client-side initialization to avoid Next.js prerender date impurity
  React.useEffect(() => {
    const now = new Date();
    setSelectedDate(now);
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    setTodayStartMs(startOfToday);
    setFormData((prev) => ({
      ...prev,
      year: prev.year || now.getFullYear().toString(),
    }));
  }, []);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedJobCode, setConfirmedJobCode] = useState<string>("");

  // Month navigation
  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }
    return days;
  }, [currentMonth]);

  const monthYearString = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const formattedSelectedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Handle form field change
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.firstName.trim()) errors.firstName = "First name is required";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required";
    if (!formData.email.trim() || !formData.email.includes("@"))
      errors.email = "Valid email is required";
    if (!formData.phone.trim() || formData.phone.length < 7)
      errors.phone = "Valid contact phone is required";
    if (!formData.year) errors.year = "Vehicle year is required";
    if (!formData.make.trim()) errors.make = "Vehicle make is required";
    if (!formData.model.trim()) errors.model = "Vehicle model is required";
    if (!formData.address.trim())
      errors.address = "Service breakdown address is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit to Backend API
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const isAsap = selectedTime.includes("ASAP") || selectedTime.includes("Immediate");
      const finalTime = isCustomTime && customTime ? customTime : selectedTime;

      // Construct scheduled timestamp
      const scheduledDateTime = new Date(selectedDate);
      if (!isAsap) {
        const [timePart, meridiem] = finalTime.split(" ");
        if (timePart && meridiem) {
          let [hours, minutes] = timePart.split(":").map(Number);
          if (meridiem === "PM" && hours < 12) hours += 12;
          if (meridiem === "AM" && hours === 12) hours = 0;
          scheduledDateTime.setHours(hours || 12, minutes || 0, 0, 0);
        }
      }

      const payload = {
        source: "WEBSITE",
        countryCode: "CA",
        urgency: isAsap ? "URGENT" : "STANDARD",
        scheduledFor: scheduledDateTime.toISOString(),
        appointmentDate: scheduledDateTime.toISOString(),
        serviceTimezone: selectedTimezone,
        serviceAddress: formData.address.trim(),
        recipientName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        recipientPhone: formData.phone.trim(),
        customer: {
          name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          phone: formData.phone.trim(),
          email: formData.email.trim(),
        },
        vehicle: {
          year: Number(formData.year) || new Date().getFullYear(),
          make: formData.make.trim(),
          model: formData.model.trim(),
          trim: formData.trim.trim() || undefined,
          tireSize: "TBD",
        },
        services: [serviceTitle],
        serviceItems: [
          {
            serviceName: serviceTitle,
            category: serviceCategory || initialServiceCategory || "TIRE_SERVICE",
            unitPriceCents: 5000,
            quantity: 1,
          },
        ],
        problemNotes: [
          formData.notes.trim() ? `Customer Notes: ${formData.notes.trim()}` : null,
          `Time Preference: ${isAsap ? "Immediate Dispatch (24/7 ASAP)" : finalTime}`,
        ]
          .filter(Boolean)
          .join("\n"),
      };

      const res = await fetch(`${API_BASE_URL}/jobs/public-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to submit booking request");
      }

      const generatedCode = json.data?.jobCode || `PUB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setConfirmedJobCode(generatedCode);
      setStep(3); // Advance to Confirmation
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong. Please call dispatch directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedDate(new Date());
    setSelectedTime("01:30 PM");
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      year: new Date().getFullYear().toString(),
      make: "",
      model: "",
      trim: "",
      address: "",
      notes: "",
    });
    setFormErrors({});
    setSubmitError(null);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
        {/* Full-Screen Backdrop: Sits in front of the navbar (z-[9999]) and blurs the navbar and page behind it */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-none shadow-2xl overflow-hidden z-10 flex flex-col max-h-[94dvh]"
        >
          {/* Top Bar matching Taylor Tire: Brand Logo, Back/Step Title, Progress Dots, Close */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
            <div className="flex items-center gap-4">
              <span className="font-black italic tracking-tighter text-lg sm:text-xl text-zinc-950 dark:text-white">
                XTREME <span className="text-[#DC2626]">MOBILE TIRE</span>
              </span>

              {/* Step Title & Back Navigation */}
              <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {step > 1 && step < 3 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => (s - 1) as any)}
                    className="p-1 hover:text-black dark:hover:text-white transition cursor-pointer"
                    title="Back"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <span>
                  {step === 1
                    ? "Select a time"
                    : step === 2
                    ? "Your Details"
                    : "Confirmation"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Progress Dots Indicator */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    step >= 1 ? "bg-emerald-500 scale-110" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                />
                <span
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    step >= 2 ? "bg-emerald-500 scale-110" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                />
                <span
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    step === 3 ? "bg-emerald-500 scale-110" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                />
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 sm:p-7">
            {/* =========================================================================
                STEP 1: SELECT A TIME & DATE (TAYLOR TIRE CALENDAR LAYOUT)
                ========================================================================= */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Selected Service with Hierarchical Dropdown */}
                <div className="relative z-30" ref={dropdownRef}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setIsServiceDropdownOpen((prev) => !prev)}
                      className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 hover:border-[#DC2626] dark:hover:border-[#DC2626] transition-all cursor-pointer shadow-xs hover:shadow-sm text-left max-w-full sm:max-w-md"
                      title="Click to change service category"
                    >
                      <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/60 text-[#DC2626] shrink-0 group-hover:scale-105 transition-transform">
                        {React.createElement(
                          BOOKING_SERVICE_CATEGORIES.find((c) => c.services.includes(serviceTitle))?.icon || Wrench,
                          { className: "w-4 h-4" }
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          <span>
                            {BOOKING_SERVICE_CATEGORIES.find((c) => c.services.includes(serviceTitle))?.name || "Service Category"}
                          </span>
                          <span className="text-zinc-300 dark:text-zinc-700">•</span>
                          <span className="text-[#DC2626] group-hover:underline">Click to change</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 font-bold text-sm sm:text-base text-zinc-950 dark:text-white truncate">
                          <span className="truncate">{serviceTitle}</span>
                          <ChevronDown
                            className={`w-4 h-4 text-zinc-400 group-hover:text-[#DC2626] transition-transform duration-200 shrink-0 ${
                              isServiceDropdownOpen ? "rotate-180 text-[#DC2626]" : ""
                            }`}
                          />
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Hierarchical 2-Level Dropdown Menu */}
                  <AnimatePresence>
                    {isServiceDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="absolute left-0 top-full mt-2 w-full sm:w-[580px] max-w-[95vw] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-zinc-800"
                      >
                        {/* Level 1: Categories Column */}
                        <div className="w-full sm:w-[240px] p-2 bg-zinc-50/70 dark:bg-zinc-900/60 space-y-1 shrink-0">
                          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Select Category
                          </div>
                          {BOOKING_SERVICE_CATEGORIES.map((cat) => {
                            const IconComponent = cat.icon;
                            const isActive = activeCategoryTab === cat.id;
                            const hasSelectedService = cat.services.includes(serviceTitle);

                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setActiveCategoryTab(cat.id)}
                                onMouseEnter={() => setActiveCategoryTab(cat.id)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                                  isActive
                                    ? "bg-white dark:bg-zinc-800 text-[#DC2626] shadow-xs font-bold"
                                    : "text-zinc-700 dark:text-zinc-300 hover:bg-white/80 dark:hover:bg-zinc-800/60"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`p-1.5 rounded-lg ${
                                      isActive
                                        ? "bg-red-50 dark:bg-red-950/60 text-[#DC2626]"
                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                    }`}
                                  >
                                    <IconComponent className="w-3.5 h-3.5 shrink-0" />
                                  </div>
                                  <span className="truncate">{cat.name}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 ml-1">
                                  {hasSelectedService && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                                  )}
                                  <ChevronRight
                                    className={`w-3.5 h-3.5 ${
                                      isActive
                                        ? "text-[#DC2626] translate-x-0.5"
                                        : "text-zinc-400"
                                    } transition-transform`}
                                  />
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Level 2: Sub-Services Column */}
                        <div className="flex-1 p-3 bg-white dark:bg-zinc-900 space-y-1.5">
                          <div className="px-2 pb-1.5 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                            <span>
                              {BOOKING_SERVICE_CATEGORIES.find((c) => c.id === activeCategoryTab)?.name} Services
                            </span>
                            <span className="text-zinc-400 text-[10px] lowercase font-normal">
                              click to select
                            </span>
                          </div>

                          <div className="space-y-1 pt-1 max-h-[260px] overflow-y-auto">
                            {BOOKING_SERVICE_CATEGORIES.find(
                              (c) => c.id === activeCategoryTab
                            )?.services.map((svc) => {
                              const isSelected = serviceTitle === svc;
                              return (
                                <button
                                  key={svc}
                                  type="button"
                                  onClick={() => {
                                    setServiceTitle(svc);
                                    const cat = BOOKING_SERVICE_CATEGORIES.find(
                                      (c) => c.id === activeCategoryTab
                                    );
                                    if (cat) setServiceCategory(cat.code);
                                    setIsServiceDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                                    isSelected
                                      ? "bg-red-50/90 dark:bg-red-950/50 text-[#DC2626] border border-red-200 dark:border-red-900/50 font-bold shadow-2xs"
                                      : "text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 border border-transparent"
                                  }`}
                                >
                                  <span className="pr-2">{svc}</span>
                                  {isSelected && (
                                    <Check className="w-4 h-4 text-[#DC2626] shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Month Calendar + Timezone */}
                  <div className="lg:col-span-7 space-y-5">
                    {/* Month Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                      <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                        {monthYearString}
                      </h3>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={prevMonth}
                          className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={nextMonth}
                          className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 text-center font-bold text-xs text-zinc-400 dark:text-zinc-500 pb-1">
                      {DAYS_OF_WEEK.map((d, i) => (
                        <div key={i}>{d}</div>
                      ))}
                    </div>

                    {/* Calendar grid (No blackout dates, full 24/7 flexibility) */}
                    <div className="grid grid-cols-7 gap-1.5 text-center">
                      {calendarDays.map((dayNum, idx) => {
                        if (dayNum === null) {
                          return <div key={`empty-${idx}`} className="h-10" />;
                        }

                        const dObj = new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth(),
                          dayNum
                        );
                        const isSelected =
                          selectedDate.getFullYear() === dObj.getFullYear() &&
                          selectedDate.getMonth() === dObj.getMonth() &&
                          selectedDate.getDate() === dObj.getDate();

                        const isPast =
                          todayStartMs !== null
                            ? new Date(
                                currentMonth.getFullYear(),
                                currentMonth.getMonth(),
                                dayNum
                              ).getTime() < todayStartMs
                            : false;

                        return (
                          <button
                            key={`day-${dayNum}`}
                            type="button"
                            disabled={isPast}
                            onClick={() => {
                              setSelectedDate(
                                new Date(
                                  currentMonth.getFullYear(),
                                  currentMonth.getMonth(),
                                  dayNum
                                )
                              );
                            }}
                            className={`h-11 sm:h-12 rounded-lg flex flex-col items-center justify-center font-bold text-sm transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#DC2626] text-white shadow-md shadow-red-600/30 font-black scale-105"
                                : isPast
                                ? "text-zinc-300 dark:text-zinc-700 cursor-not-allowed opacity-40"
                                : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white"
                            }`}
                          >
                            <span>{dayNum}</span>
                            <span className="text-[9px] font-normal opacity-75">24/7</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Timezone Selector */}
                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                        Time zone
                      </label>
                      <select
                        value={selectedTimezone}
                        onChange={(e) => setSelectedTimezone(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-[#DC2626]"
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Right Column: 24/7 Time Slots & Dispatcher Option */}
                  <div className="lg:col-span-5 space-y-4">
                    <h4 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white pb-2 border-b border-zinc-200 dark:border-zinc-800">
                      {formattedSelectedDate}
                    </h4>

                    {/* Time Slot Tabs (Morning, Afternoon, Evening, Overnight) */}
                    <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-semibold">
                      {(["morning", "afternoon", "evening", "overnight"] as const).map(
                        (period) => (
                          <button
                            key={period}
                            type="button"
                            onClick={() => {
                              setTimeCategory(period);
                              setIsCustomTime(false);
                            }}
                            className={`flex-1 py-1.5 capitalize rounded-md transition cursor-pointer text-center text-[11px] ${
                              timeCategory === period && !isCustomTime
                                ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs font-bold"
                                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                            }`}
                          >
                            {period}
                          </button>
                        )
                      )}
                    </div>

                    {/* Pre-set Slot Pills */}
                    {!isCustomTime && (
                      <div className="grid grid-cols-2 gap-2 max-h-[190px] overflow-y-auto pr-1">
                        {TIME_SLOTS_24_7[timeCategory].map((slot) => {
                          const isSelected = selectedTime === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => {
                                setSelectedTime(slot);
                                setIsCustomTime(false);
                              }}
                              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition border cursor-pointer text-center ${
                                isSelected
                                  ? "bg-[#DC2626] text-white border-[#DC2626] shadow-sm"
                                  : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:border-zinc-400"
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Custom Time Selector Accordion */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setIsCustomTime(!isCustomTime)}
                        className="text-xs font-bold text-[#DC2626] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {isCustomTime
                            ? "← Back to standard slot list"
                            : "Enter custom exact time instead"}
                        </span>
                      </button>

                      {isCustomTime && (
                        <div className="mt-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 space-y-2">
                          <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">
                            Specify Exact Time (24/7):
                          </label>
                          <input
                            type="time"
                            value={customTime}
                            onChange={(e) => {
                              setCustomTime(e.target.value);
                              setSelectedTime(e.target.value);
                            }}
                            className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                          />
                        </div>
                      )}
                    </div>

                    {/* Continue Button to Step 2 */}
                    <div className="pt-3">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="w-full py-3 px-6 rounded-none bg-[#DC2626] hover:bg-black dark:hover:bg-white dark:hover:text-black text-white font-bold text-sm tracking-wide transition-all duration-300 shadow-md cursor-pointer"
                      >
                        Continue to Vehicle & Contact Details →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                STEP 2: VEHICLE & CONTACT DETAILS (TAYLOR TIRE FORM LAYOUT)
                ========================================================================= */}
            {step === 2 && (
              <form onSubmit={handleConfirmBooking} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                      Your Details
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      Enter your vehicle and contact information to complete the booking.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs font-bold text-[#DC2626] self-start sm:self-auto">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>{serviceTitle}</span>
                  </div>
                </div>

                {submitError && (
                  <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Left Column: Personal Contact */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 outline-none transition ${
                          formErrors.firstName
                            ? "border-red-500"
                            : "border-zinc-200 dark:border-zinc-700 focus:border-[#DC2626]"
                        }`}
                      />
                      {formErrors.firstName && (
                        <p className="text-[10px] text-red-500 mt-1">{formErrors.firstName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 outline-none transition ${
                          formErrors.lastName
                            ? "border-red-500"
                            : "border-zinc-200 dark:border-zinc-700 focus:border-[#DC2626]"
                        }`}
                      />
                      {formErrors.lastName && (
                        <p className="text-[10px] text-red-500 mt-1">{formErrors.lastName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 outline-none transition ${
                          formErrors.email
                            ? "border-red-500"
                            : "border-zinc-200 dark:border-zinc-700 focus:border-[#DC2626]"
                        }`}
                      />
                      {formErrors.email && (
                        <p className="text-[10px] text-red-500 mt-1">{formErrors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        placeholder="(905) 000-0000"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 outline-none transition ${
                          formErrors.phone
                            ? "border-red-500"
                            : "border-zinc-200 dark:border-zinc-700 focus:border-[#DC2626]"
                        }`}
                      />
                      {formErrors.phone && (
                        <p className="text-[10px] text-red-500 mt-1">{formErrors.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Vehicle Specifics */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Year *
                      </label>
                      <select
                        value={formData.year}
                        onChange={(e) => handleInputChange("year", e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 outline-none focus:border-[#DC2626]"
                      >
                        {Array.from({ length: 33 }, (_, i) => 2026 - i).map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Make *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Ford, Toyota, BMW"
                        list="makes-list"
                        value={formData.make}
                        onChange={(e) => handleInputChange("make", e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 outline-none transition ${
                          formErrors.make
                            ? "border-red-500"
                            : "border-zinc-200 dark:border-zinc-700 focus:border-[#DC2626]"
                        }`}
                      />
                      <datalist id="makes-list">
                        {POPULAR_MAKES.map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                      {formErrors.make && (
                        <p className="text-[10px] text-red-500 mt-1">{formErrors.make}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Model *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. F-150, Civic, Silverado"
                        value={formData.model}
                        onChange={(e) => handleInputChange("model", e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 outline-none transition ${
                          formErrors.model
                            ? "border-red-500"
                            : "border-zinc-200 dark:border-zinc-700 focus:border-[#DC2626]"
                        }`}
                      />
                      {formErrors.model && (
                        <p className="text-[10px] text-red-500 mt-1">{formErrors.model}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Trim (submodel)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Base, XLT, Sport"
                        value={formData.trim}
                        onChange={(e) => handleInputChange("trim", e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 outline-none focus:border-[#DC2626]"
                      >
                      </input>
                    </div>
                  </div>
                </div>

                {/* Full Width: Service Breakdown Address */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Service Breakdown Address *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 120 Airport Rd, Unit 4, Mississauga, ON or Highway 401 Exit 320"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 outline-none transition ${
                      formErrors.address
                        ? "border-red-500"
                        : "border-zinc-200 dark:border-zinc-700 focus:border-[#DC2626]"
                    }`}
                  />
                  {formErrors.address && (
                    <p className="text-[10px] text-red-500 mt-1">{formErrors.address}</p>
                  )}
                </div>

                {/* Full Width: Notes */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any special requests, wheel lock key location, tire specs..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 outline-none focus:border-[#DC2626]"
                  />
                </div>

                {/* Submit Confirmation CTA */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-bold text-zinc-500 hover:text-black dark:hover:text-white transition cursor-pointer"
                  >
                    ← Change Date / Time
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-none bg-[#DC2626] hover:bg-black dark:hover:bg-white dark:hover:text-black text-white font-bold text-sm tracking-wide transition-all duration-300 shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting Booking...</span>
                      </>
                    ) : (
                      <span>Confirm Booking</span>
                    )}
                  </button>
                </div>

                <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                  You can cancel or reschedule your appointment anytime before the scheduled time.
                </p>
              </form>
            )}

            {/* =========================================================================
                STEP 3: APPOINTMENT CONFIRMED SCREEN (TAYLOR TIRE CONFIRMATION)
                ========================================================================= */}
            {step === 3 && (
              <div className="py-4 sm:py-6 text-center space-y-6 max-w-xl mx-auto">
                {/* Big Green Checkmark */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
                </div>

                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                    Appointment Confirmed!
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-md mx-auto">
                    Your booking has been submitted to Xtreme Mobile Tire dispatch. You will receive a confirmation email shortly.
                  </p>
                  {confirmedJobCode && (
                    <div className="inline-block mt-3 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">
                      Ticket #{confirmedJobCode}
                    </div>
                  )}
                </div>

                {/* Structured Metadata Summary matching Screenshot */}
                <div className="text-left bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/80 rounded-xl p-5 sm:p-6 space-y-3.5 text-xs sm:text-sm">
                  <div className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-700/60 pb-2.5">
                    <span className="text-zinc-500 dark:text-zinc-400">Vehicle</span>
                    <span className="font-bold text-zinc-900 dark:text-white text-right">
                      {formData.year} {formData.make} {formData.model} {formData.trim}
                    </span>
                  </div>

                  <div className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-700/60 pb-2.5">
                    <span className="text-zinc-500 dark:text-zinc-400">Service</span>
                    <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 text-right">
                      <Wrench className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                      <span>{serviceTitle}</span>
                    </span>
                  </div>

                  <div className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-700/60 pb-2.5">
                    <span className="text-zinc-500 dark:text-zinc-400">Time</span>
                    <span className="font-bold text-zinc-900 dark:text-white text-right">
                      {formattedSelectedDate}
                      <br />
                      <span className="text-[#DC2626] font-extrabold">{selectedTime}</span>
                    </span>
                  </div>

                  <div className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-700/60 pb-2.5">
                    <span className="text-zinc-500 dark:text-zinc-400">Address</span>
                    <span className="font-bold text-zinc-900 dark:text-white text-right max-w-[240px] truncate">
                      {formData.address}
                    </span>
                  </div>

                  <div className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-700/60 pb-2.5">
                    <span className="text-zinc-500 dark:text-zinc-400">Name</span>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {formData.firstName} {formData.lastName}
                    </span>
                  </div>

                  <div className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-700/60 pb-2.5">
                    <span className="text-zinc-500 dark:text-zinc-400">Email</span>
                    <span className="font-bold text-zinc-900 dark:text-white font-mono">
                      {formData.email}
                    </span>
                  </div>

                  <div className="flex justify-between items-start">
                    <span className="text-zinc-500 dark:text-zinc-400">Phone</span>
                    <span className="font-bold text-zinc-900 dark:text-white font-mono">
                      {formData.phone}
                    </span>
                  </div>
                </div>

                {/* Book Another Appointment Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full sm:w-auto px-8 py-3 rounded-none border border-zinc-900 dark:border-white bg-transparent hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-zinc-900 dark:text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Book Another Appointment
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
