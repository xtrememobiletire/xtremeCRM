export interface ServiceItem {
  id: string;
  slug: string;
  title: string;
  shortDesc: string;
  iconName: string;
  image: string;
  stats: {
    badge: string;
    duration: string;
    equipment: string;
    warranty: string;
    checkmarks: string[];
  };
}

export interface ServiceCategory {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  description: string;
  services: ServiceItem[];
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: "tire-services",
    index: "01",
    title: "Tire Services",
    subtitle: "For all tire-related needs",
    description: "At CALL TIRE Inc., our mission is simple: to do what's best for our customers and their vehicles with touchless, rapid on-site tire expertise.",
    services: [
      {
        id: "tire-swap-on-rim",
        slug: "tire-swap-on-rim",
        title: "Tire Swap (ON RIM)",
        shortDesc: "Complete seasonal pre-mounted wheel swap and digital balancing directly at your location.",
        iconName: "RotateCw",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426873/xtreme/landing/mobile-tire-service_jpg.jpg",
        stats: {
          badge: "Seasonal On-Rim Wheel Swap",
          duration: "25-35 Mins",
          equipment: "Commercial Floor Jacks & Impact Torque",
          warranty: "100% Fitment Guarantee",
          checkmarks: [
            "Driveway or parking stall on-site wheel swap",
            "Computerized dynamic wheel balance verification",
            "TPMS digital sensor verification and recalibration",
            "OEM torque-wrench star-pattern torque verification"
          ]
        }
      },
      {
        id: "tire-swap-off-rim",
        slug: "tire-swap-off-rim",
        title: "Tire Swap (OFF RIM)",
        shortDesc: "Touchless tire dismount from rims, new seasonal tire mounting, bead seal, and laser balancing.",
        iconName: "RotateCw",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426886/xtreme/landing/tire-service-wheel_jpg.jpg",
        stats: {
          badge: "Full Dismount, Mount & Road-Force Balance",
          duration: "45-60 Mins",
          equipment: "Touchless Mobile Tire Changer & Balancer",
          warranty: "Zero Rim Scratch Guarantee",
          checkmarks: [
            "Non-contact robotic arm dismount from rims",
            "Rim bead seat corrosion cleaning and bead sealer",
            "High-speed computerized rim balancing",
            "Factory PSI inflation and valve core inspection"
          ]
        }
      },
      {
        id: "flat-tire-repair",
        slug: "flat-tire-repair",
        title: "Flat Tire Repair",
        shortDesc: "RMA-certified internal vulcanized puncture repair to get you rolling safely.",
        iconName: "Wrench",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426886/xtreme/landing/tire-service-wheel_jpg.jpg",
        stats: {
          badge: "On-Site Vulcanized Patch Repair",
          duration: "20-30 Mins",
          equipment: "Commercial RMA 2-Piece Kit",
          warranty: "Tire Lifespan Guarantee",
          checkmarks: [
            "Thorough internal tread and casing safety scan",
            "Two-piece vulcanized stem and rubber patch install",
            "Bead seal leak diagnostic under pressure",
            "Exact factory PSI inflation and road test"
          ]
        }
      },
      {
        id: "new-tires-sale",
        slug: "new-tires",
        title: "New Tires Replacement",
        shortDesc: "Top-tier OEM brands delivered, mounted, and balanced on your schedule.",
        iconName: "Sparkles",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426887/xtreme/landing/tire-shop_jpg.jpg",
        stats: {
          badge: "Premium OEM Brands Delivered",
          duration: "45-60 Mins",
          equipment: "Michelin, Pirelli, Continental, Goodyear",
          warranty: "Full Manufacturer Warranty",
          checkmarks: [
            "Direct competitive wholesale tier pricing",
            "High-speed computerized rim balancing",
            "Old tire eco-friendly disposal and recycling",
            "Complimentary TPMS valve stem inspection"
          ]
        }
      },
      {
        id: "used-tires-sale",
        slug: "used-tires",
        title: "Used Tires Replacement",
        shortDesc: "Multi-point safety inspected certified pre-owned tires for budget reliability.",
        iconName: "BadgeCheck",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426893/xtreme/landing/wheel-car_jpg.png",
        stats: {
          badge: "Certified Pre-Owned Multi-Point Tested",
          duration: "30-45 Mins",
          equipment: "Laser Depth and Casing Integrity Scan",
          warranty: "30-Day Defect Warranty",
          checkmarks: [
            "Guaranteed 70%+ remaining tread life depth",
            "High-pressure immersion bubble test",
            "Zero sidewall damage or shoulder defects",
            "Full mounting, balancing, and bead seal"
          ]
        }
      },
      {
        id: "wheel-balance-rotation",
        slug: "wheel-balance-rotation",
        title: "Wheel Balancing & Rotation",
        shortDesc: "High-precision dynamic wheel balancing and tire position rotation for maximum tire longevity.",
        iconName: "Disc",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426864/xtreme/landing/fleet-vans_jpg.jpg",
        stats: {
          badge: "Vibration-Free Road Contact",
          duration: "25-35 Mins",
          equipment: "Digital Laser Road-Force Balancer",
          warranty: "Smooth Ride Guarantee",
          checkmarks: [
            "Dynamic double-plane spin balancing",
            "Corrective zinc weight calibration",
            "Even treadwear cross-pattern rotation",
            "Lug nut torque verification to OEM spec"
          ]
        }
      }
    ]
  },
  {
    id: "wheel-rim-services",
    index: "02",
    title: "Wheel & Rim Services",
    subtitle: "Wheel repair and replacement",
    description: "Restore curb damaged alloy rims to showroom brilliance and replace bent or cracked wheels on-site.",
    services: [
      {
        id: "rim-repair",
        slug: "rim-repair",
        title: "Rim Repair",
        shortDesc: "Complete mobile cosmetic and structural alloy restoration for curb rash and minor bends.",
        iconName: "Disc3",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426894/xtreme/landing/wheel-detail_jpg.jpg",
        stats: {
          badge: "Alloy Curb Rash and Trueing Restoration",
          duration: "45-60 Mins",
          equipment: "Hydraulic Trueing and Precision CNC Polish",
          warranty: "Flawless Finish Guarantee",
          checkmarks: [
            "Curb rash sanding and alloy micro-weld filling",
            "Factory exact color-matched paint blending",
            "Automotive-grade protective clearcoat bake",
            "Radial runout inspection for perfect vibration-free spin"
          ]
        }
      },
      {
        id: "rim-replacement",
        slug: "rim-replacement",
        title: "New & Used Rim Replacement",
        shortDesc: "OEM and aftermarket replacement wheels delivered, mounted, and balanced on location.",
        iconName: "Disc",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426893/xtreme/landing/wheel-car_jpg.png",
        stats: {
          badge: "Direct Fitment Wheel Replacement",
          duration: "30-45 Mins",
          equipment: "OEM Spec Direct Replacements",
          warranty: "Fitment & Structural Guarantee",
          checkmarks: [
            "Factory OEM steel and alloy wheel match",
            "Precision offset and bolt-pattern verification",
            "Old cracked or bent rim safe removal",
            "Full tire re-mounting, valve stem, and balance"
          ]
        }
      }
    ]
  },
  {
    id: "roadside-assistance",
    index: "03",
    title: "Roadside Assistance",
    subtitle: "24/7 priority emergency roadside help",
    description: "Rapid emergency dispatch across our service corridors. Fully equipped mobile vans arrive with real-time GPS tracking.",
    services: [
      {
        id: "roadside-247",
        slug: "roadside-assistance-247",
        title: "Roadside Assistance (24/7)",
        shortDesc: "All-hours priority emergency dispatch with real-time GPS technician tracking.",
        iconName: "Clock",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426862/xtreme/landing/fleet-semi_jpg.jpg",
        stats: {
          badge: "24/7 Priority Emergency Dispatch",
          duration: "Under 35 Mins Response",
          equipment: "Heavy-Duty Mobile Response Unit",
          warranty: "Emergency Priority Guarantee",
          checkmarks: [
            "Real-time SMS and GPS live tracking link",
            "Highway safety perimeter and lighting setup",
            "Immediate emergency roadside triage",
            "Seamless spare tire change, jump, or dispatch"
          ]
        }
      },
      {
        id: "spare-tire-change",
        slug: "spare-tire-change",
        title: "Spare Tire Change",
        shortDesc: "Rapid roadside installation of your vehicle's spare or donut tire when you suffer a blowout.",
        iconName: "Wrench",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426881/xtreme/landing/service-mobile-van_jpg.jpg",
        stats: {
          badge: "Rapid Roadside Spare Install",
          duration: "15-25 Mins",
          equipment: "Hydraulic Jack & Pneumatic Lugs",
          warranty: "Safe Roadway Guarantee",
          checkmarks: [
            "Spare tire pressure check and inflation",
            "Lug nut safety torque calibration",
            "Damaged tire securely stowed in trunk",
            "Hazard safety perimeter on road shoulder"
          ]
        }
      },
      {
        id: "battery-boost",
        slug: "battery-boost",
        title: "Battery Boost / Jump-Start",
        shortDesc: "Rapid on-location battery diagnostic and high-amperage surge-protected jump-start.",
        iconName: "Zap",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426859/xtreme/landing/fleet-electric_jpg.jpg",
        stats: {
          badge: "Instant Battery Boost and Diagnostic",
          duration: "15-20 Mins",
          equipment: "Industrial High-Amp Jump System",
          warranty: "Reliable Start Guarantee",
          checkmarks: [
            "Digital alternator and starter load diagnostic",
            "Clean surge-protected high-amperage jump-start",
            "Battery terminal corrosion cleaning and seal",
            "On-site battery replacement option if depleted"
          ]
        }
      },
      {
        id: "car-lockout",
        slug: "car-lockout",
        title: "Car Lockout / Locksmith",
        shortDesc: "Damage-free, non-destructive vehicle entry when your keys are locked inside.",
        iconName: "KeyRound",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426864/xtreme/landing/fleet-vans_jpg.jpg",
        stats: {
          badge: "Damage-Free Automotive Lockout",
          duration: "15-25 Mins",
          equipment: "Non-Marring Inflatable Wedge Kit",
          warranty: "Zero-Scratch Guarantee",
          checkmarks: [
            "Scratch-free non-marring high pressure wedges",
            "Electronic door lock and trunk bypass capability",
            "Strict owner identity verification protocol",
            "Fast arrival to roadside, parkades, or residences"
          ]
        }
      },
      {
        id: "fuel-delivery",
        slug: "gas-diesel-delivery",
        title: "Gas and Diesel Delivery",
        shortDesc: "Clean emergency fuel brought directly to your empty tank so you can reach the nearest station.",
        iconName: "Fuel",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426863/xtreme/landing/fleet-trucks_jpg.jpg",
        stats: {
          badge: "Emergency On-Site Fuel Delivery",
          duration: "20-30 Mins",
          equipment: "DOT-Certified Safety Fuel Dispensers",
          warranty: "Immediate Restart Guarantee",
          checkmarks: [
            "Clean regular unleaded, premium, or diesel fuel",
            "Spill-free safety transfer directly into fuel neck",
            "Fuel line priming and engine start verification",
            "Turn-by-turn guidance to nearest fuel station"
          ]
        }
      }
    ]
  },
  {
    id: "mobile-auto-maintenance",
    index: "04",
    title: "Mobile Auto Maintenance",
    subtitle: "Routine vehicle maintenance at your doorstep",
    description: "Certified routine maintenance brought right to your driveway or workplace with zero dealer wait times.",
    services: [
      {
        id: "oil-change",
        slug: "oil-change",
        title: "Oil Change",
        shortDesc: "Premium full-synthetic oil and OEM filter replacement at your doorstep.",
        iconName: "Droplets",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426863/xtreme/landing/fleet-trucks_jpg.jpg",
        stats: {
          badge: "Full Synthetic Lube and Filter Service",
          duration: "30-40 Mins",
          equipment: "Mobil 1 / Castrol Edge Synthetic",
          warranty: "Certified Tech Guarantee",
          checkmarks: [
            "Full manufacturer synthetic formulation oil",
            "Premium OEM-grade oil filter replacement",
            "Multi-fluid top off: washer, brake, and coolant",
            "Eco-friendly zero-spill used oil extraction and recycling"
          ]
        }
      },
      {
        id: "brake-inspection",
        slug: "brake-inspection",
        title: "Brake Inspection & Service",
        shortDesc: "Mobile brake wear diagnostic, pad inspection, and rotor measurements for confident stopping.",
        iconName: "Disc",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426886/xtreme/landing/tire-service-wheel_jpg.jpg",
        stats: {
          badge: "Comprehensive Brake Safety Check",
          duration: "30-45 Mins",
          equipment: "Digital Micrometer & Caliper Gauges",
          warranty: "Safety Inspection Certificate",
          checkmarks: [
            "Micrometer digital rotor thickness measurement",
            "Brake pad remaining thickness percentage check",
            "Brake fluid moisture and boiling point test",
            "Full caliper, line, and hydraulic leak inspection"
          ]
        }
      },
      {
        id: "battery-replacement",
        slug: "battery-replacement",
        title: "Battery Installation & Replacement",
        shortDesc: "On-site commercial-grade battery replacement with alternator and starter test.",
        iconName: "Zap",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426859/xtreme/landing/fleet-electric_jpg.jpg",
        stats: {
          badge: "OEM-Spec Fresh Battery Installation",
          duration: "25-35 Mins",
          equipment: "Interstate / DieHard High-CCA Batteries",
          warranty: "3-Year Free Replacement Warranty",
          checkmarks: [
            "Cold cranking amps (CCA) charging test",
            "Terminal post wire-brush and anti-corrosion spray",
            "Old battery eco-friendly recycling return",
            "On-board memory preservation during installation"
          ]
        }
      }
    ]
  }
];
