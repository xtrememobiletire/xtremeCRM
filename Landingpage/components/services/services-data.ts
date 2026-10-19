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
    description: "At XtremeMobileTire, our mission is simple: to do what's best for our customers and their vehicles with touchless, rapid on-site tire expertise.",
    services: [
      {
        id: "seasonal-tire-change",
        slug: "seasonal-tire-change",
        title: "Seasonal Tire Change (ON/OFF RIM)",
        shortDesc: "Complete seasonal swap with laser-balanced precision directly in your driveway.",
        iconName: "RotateCw",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426873/xtreme/landing/mobile-tire-service_jpg.jpg",
        stats: {
          badge: "Seasonal Tire Swap and Laser Balance",
          duration: "30-45 Mins",
          equipment: "Hunter Road Force Touchless",
          warranty: "100% Fitment Guarantee",
          checkmarks: [
            "Touchless rim demounting and rim seat inspection",
            "Computerized dynamic wheel balancing",
            "TPMS digital sensor verification and recalibration",
            "OEM torque-wrench specifications verified"
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
        title: "New Tires for Sale",
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
        title: "Used Tires for Sale",
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
        id: "tire-storage",
        slug: "tire-storage",
        title: "Tire Storage",
        shortDesc: "Insured, climate-controlled seasonal storage facility with doorstep pickup.",
        iconName: "Warehouse",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426864/xtreme/landing/fleet-vans_jpg.jpg",
        stats: {
          badge: "Climate-Controlled Insured Storage",
          duration: "Doorstep Pickup and Delivery",
          equipment: "UV and Temperature-Controlled Facility",
          warranty: "Fully Insured Coverage",
          checkmarks: [
            "Deep wheel wash and preservative tire conditioning",
            "Individual barcode tagged and indexed storage",
            "Safe from ozone, sunlight, and moisture corrosion",
            "Seamless seasonal swap delivery on demand"
          ]
        }
      }
    ]
  },
  {
    id: "wheel-rim-services",
    index: "02",
    title: "Wheel and Rim Services",
    subtitle: "Wheel repair and protection",
    description: "Restore curb damaged alloy rims to showroom brilliance and safeguard high-value wheels from future street hazards.",
    services: [
      {
        id: "rim-repair",
        slug: "rim-repair",
        title: "Rim Repair",
        shortDesc: "Complete mobile cosmetic and structural alloy restoration for curb rash and bends.",
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
        id: "rim-protector-installation",
        slug: "rim-protector-installation",
        title: "Rim Protector Installation",
        shortDesc: "Engineered high-impact edge defense barriers guarding your wheels against curb impact.",
        iconName: "ShieldCheck",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426893/xtreme/landing/wheel-car_jpg.png",
        stats: {
          badge: "Precision Wheel Guard Defense Armor",
          duration: "30-45 Mins",
          equipment: "AlloyGator Certified System",
          warranty: "1-Year Impact Warranty",
          checkmarks: [
            "Tough composite nylon edge impact absorption",
            "Interlocking seat technology behind rim bead",
            "Available in discreet OEM or bold custom colors",
            "Maintains vehicle trade-in and wheel resale value"
          ]
        }
      }
    ]
  },
  {
    id: "mobile-auto-maintenance",
    index: "03",
    title: "Mobile Auto Maintenance",
    subtitle: "Routine maintenance and basic vehicle repairs",
    description: "Certified dealership-grade maintenance brought right to your driveway or workplace with zero dealer wait times.",
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
        id: "brake-replacement",
        slug: "brake-replacement",
        title: "Brake Replacement",
        shortDesc: "Ceramic pad and rotor replacement for silent, decisive stopping confidence.",
        iconName: "Disc",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426886/xtreme/landing/tire-service-wheel_jpg.jpg",
        stats: {
          badge: "Ceramic Brake Pads and Rotors",
          duration: "60-75 Mins",
          equipment: "Akebono / Bosch Ceramic Hardware",
          warranty: "24-Month / 24,000-Mile Warranty",
          checkmarks: [
            "Micrometer digital rotor and pad wear analysis",
            "Hardware, guide pin, and slide rail lubrication",
            "Brake fluid moisture check and air bleed verification",
            "Dynamic stopping safety road calibration test"
          ]
        }
      },
      {
        id: "battery-boost",
        slug: "battery-boost",
        title: "Battery Boost / Jump-Start",
        shortDesc: "Rapid on-location battery diagnostic, high-amperage jump-start, or new battery fitment.",
        iconName: "Zap",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426859/xtreme/landing/fleet-electric_jpg.jpg",
        stats: {
          badge: "Instant Battery Boost and Diagnostic",
          duration: "15-25 Mins",
          equipment: "Industrial High-Amp Jump System",
          warranty: "Reliable Start Guarantee",
          checkmarks: [
            "Digital alternator and starter load diagnostic",
            "Clean surge-protected high-amperage jump-start",
            "Battery terminal corrosion cleaning and protective seal",
            "On-site Interstate battery replacement if required"
          ]
        }
      }
    ]
  },
  {
    id: "roadside-assistance",
    index: "04",
    title: "Roadside Assistance",
    subtitle: "Help when customers are stranded",
    description: "24/7 rapid roadside emergency dispatch across Canada and the US. Help arrives within minutes to keep you safe.",
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
            "Up to 3 gallons of clean regular, premium, or diesel",
            "Spill-free safety transfer directly into fuel neck",
            "Fuel line priming and engine start verification",
            "Turn-by-turn guidance to nearest fuel station"
          ]
        }
      }
    ]
  },
  {
    id: "vehicle-care-protection",
    index: "05",
    title: "Vehicle Care and Protection",
    subtitle: "Keep vehicles clean and protected",
    description: "Deep luxury interior rejuvenation and advanced self-healing paint protection film applied with meticulous care.",
    services: [
      {
        id: "car-detailing",
        slug: "car-detailing",
        title: "Car Detailing",
        shortDesc: "Mobile luxury interior steam extraction, exterior hand wash, and hydrophobic paint seal.",
        iconName: "Sparkles",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426894/xtreme/landing/wheel-detail_jpg.jpg",
        stats: {
          badge: "Full Interior and Exterior Luxury Detail",
          duration: "90-120 Mins",
          equipment: "De-ionized Water and High-Temp Steam",
          warranty: "Showroom Finish Guarantee",
          checkmarks: [
            "pH-neutral foam bath and scratch-free two-bucket wash",
            "High-temperature steam interior sanitization and stain lift",
            "Leather conditioning with deep UV-ray blockers",
            "Hydrophobic ceramic tire dressing and rim sealing"
          ]
        }
      },
      {
        id: "ppf-protection",
        slug: "ppf-paint-protection",
        title: "PPF (Paint Protection Film)",
        shortDesc: "Self-healing optical polyurethane film shielding your paintwork from rock chips and road debris.",
        iconName: "Shield",
        image: "https://res.cloudinary.com/ebjikx52/image/upload/v1792426893/xtreme/landing/wheel-car_jpg.png",
        stats: {
          badge: "Self-Healing Stone Chip Armor",
          duration: "Custom Scheduled",
          equipment: "Computer-Cut Precision Plotter",
          warranty: "10-Year Anti-Yellowing Warranty",
          checkmarks: [
            "Heat-activated self-healing topcoat technology",
            "High-impact rock chip, salt, and scratch deflection",
            "Computer cut precision patterns matching exact body panels",
            "Optically clear gloss preserving factory depth"
          ]
        }
      }
    ]
  }
];
