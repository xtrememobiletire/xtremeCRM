import React from "react";

export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["AutoRepair", "EmergencyService"],
        "@id": "https://xtrememobiletire.com/#organization",
        "name": "Xtreme Mobile Tire",
        "alternateName": "Xtreme Mobile Tire Solutions",
        "url": "https://xtrememobiletire.com",
        "logo": "https://res.cloudinary.com/ebjikx52/image/upload/v1792426904/xtreme/frontend/logo_webp.webp",
        "image": "https://res.cloudinary.com/ebjikx52/image/upload/v1792426881/xtreme/landing/service-mobile-van_jpg.jpg",
        "description": "24/7 on-demand mobile tire repair, tire replacement, roadside assistance, and commercial fleet management solutions delivered directly to your location.",
        "telephone": "+1-804-326-5442",
        "email": "Info@Xtrememobiletire.com",
        "priceRange": "$$",
        "currenciesAccepted": "USD, CAD",
        "paymentAccepted": "Credit Card, Debit Card, Fleet Account Invoicing",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "11815 Medway Church Loop",
          "addressLocality": "Manassas",
          "addressRegion": "VA",
          "postalCode": "20109",
          "addressCountry": "US"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 38.7509,
          "longitude": -77.4753
        },
        "areaServed": [
          { "@type": "State", "name": "Virginia" },
          { "@type": "State", "name": "Maryland" },
          { "@type": "AdministrativeArea", "name": "District of Columbia" },
          { "@type": "State", "name": "North Carolina" },
          { "@type": "State", "name": "Kentucky" },
          { "@type": "State", "name": "Tennessee" },
          { "@type": "AdministrativeArea", "name": "Ontario, Canada" }
        ],
        "openingHoursSpecification": [
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday"
            ],
            "opens": "00:00",
            "closes": "23:59"
          }
        ],
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "Mobile Tire Services",
          "itemListElement": [
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "24/7 Emergency Mobile Tire Repair",
                "description": "Rapid on-site flat tire repair, puncture sealing, and roadside spare changes wherever stranded."
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "On-Site Tire Replacement & Installation",
                "description": "Brand-new tire delivery, mounting, and computer balancing at your home, workplace, or roadside."
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Commercial Fleet Tire Management",
                "description": "Comprehensive fleet tire maintenance, DOT safety inspections, torque audits, and emergency roadside dispatch."
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Computerized Wheel Balancing & TPMS Service",
                "description": "High-precision on-site wheel balancing and tire pressure monitoring system diagnostic and reset."
              }
            }
          ]
        }
      },
      {
        "@type": "FAQPage",
        "@id": "https://xtrememobiletire.com/#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How fast does an Xtreme Mobile Tire van arrive?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "For 24/7 emergency roadside calls, our mobile tire units are typically dispatched immediately with rapid arrival directly to your vehicle's GPS coordinates."
            }
          },
          {
            "@type": "Question",
            "name": "What services can you perform on-site?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Our mobile service vans are equipped with commercial-grade mounting machines, digital balancers, and air compressors to handle flat tire repairs, full tire replacements, TPMS resets, and seasonal swaps on-site."
            }
          },
          {
            "@type": "Question",
            "name": "Do you provide on-site tire services for commercial fleets?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. We offer scheduled yard maintenance, routine pressure and tread inspections, commercial tire replacement, and 24/7 priority emergency roadside rescue for fleet accounts."
            }
          },
          {
            "@type": "Question",
            "name": "What areas do you service?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We serve Virginia, Maryland, Washington DC, North Carolina, Kentucky, Tennessee in the United States, and Ontario in Canada."
            }
          }
        ]
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
