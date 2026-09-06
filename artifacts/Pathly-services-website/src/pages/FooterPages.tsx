import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';

function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  const [, navigate] = useLocation();
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-xs text-[#0B3D6D] hover:underline font-semibold cursor-pointer"
      >
        <ArrowLeft size={14} /> Back to Home
      </button>
      <div className="bg-white border border-slate-300 p-6">
        <h1 className="text-xl font-black text-[#0B3D6D] uppercase tracking-wide border-b-2 border-[#FF9933] pb-2 mb-4">
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
}

export function AboutPage() {
  return (
    <PageShell title="About Pathly Network">
      <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
        <p>
          Pathly is a Regional Logistics &amp; Route Intelligence platform designed to provide real-time
          accessibility monitoring, weather telemetry, and fleet coordination across the assigned regional corridor.
        </p>
        <p>
          The platform serves as a centralized command system for monitoring highway vulnerability,
          elevation profiles, bridge integrity, and emergency disaster bypass routes across the
          North Eastern Region of India.
        </p>
        <p>
          Pathly integrates GIS-based surveillance with live traffic data, vehicle tracking,
          and predictive route analytics to support logistics operations and disaster response
          coordination.
        </p>
        <p className="font-semibold text-[#0B3D6D]">
          Developed by: Pathly Regional Command
        </p>
      </div>
    </PageShell>
  );
}

export function VisionMissionPage() {
  return (
    <PageShell title="Vision & Mission">
      <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
        <div>
          <h2 className="font-bold text-[#0B3D6D] uppercase tracking-wide text-xs mb-1">Vision</h2>
          <p>
            To establish a world-class regional logistics intelligence system that ensures
            uninterrupted supply chain operations, enhances disaster response capabilities,
            and contributes to the economic development of the region through smart route
            optimization and infrastructure monitoring.
          </p>
        </div>
        <div>
          <h2 className="font-bold text-[#0B3D6D] uppercase tracking-wide text-xs mb-1">Mission</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide real-time road condition monitoring and predictive route analytics</li>
            <li>Enable efficient fleet coordination and vehicle tracking across the region</li>
            <li>Support disaster response with emergency bypass route intelligence</li>
            <li>Ensure supply chain continuity through weather telemetry and bridge integrity data</li>
            <li>Facilitate data-driven decision making for regional logistics operations</li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <PageShell title="Contact Us">
      {submitted ? (
        <div className="text-center py-8">
          <p className="text-sm font-semibold text-emerald-700">Thank you! Your message has been submitted.</p>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Name</label>
            <input type="text" required className="w-full border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:border-[#0B3D6D]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Email</label>
            <input type="email" required className="w-full border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:border-[#0B3D6D]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Message</label>
            <textarea rows={4} required className="w-full border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:border-[#0B3D6D]" />
          </div>
          <button type="submit" className="px-4 py-2 bg-[#0B3D6D] text-white text-xs font-bold hover:bg-[#0A3560] cursor-pointer">
            Submit
          </button>
        </form>
      )}
    </PageShell>
  );
}

export function HelpPage() {
  return (
    <PageShell title="Help / FAQ">
      <div className="space-y-4 text-sm text-slate-700">
        {[
          { q: 'How do I track a vehicle?', a: 'Navigate to the Tracking page and use the search bar to enter an Order Token or registration number. The system will display the vehicle\'s live location on the map.' },
          { q: 'How do I check road conditions?', a: 'Go to the Accessibility page and select a district from the map or list. The panel will show current road vulnerability scores, elevation data, and connectivity status.' },
          { q: 'How do I report a field issue?', a: 'Navigate to the Field Reports page and click "New Report". Fill in the details and submit. The report will be synced when connectivity is restored.' },
          { q: 'How do I plan a route?', a: 'Go to the Routes page and use the Route Planner to enter origin and destination. The system will suggest optimal routes based on current road conditions.' },
        ].map((faq, i) => (
          <div key={i} className="border-b border-slate-200 pb-3">
            <p className="font-bold text-[#0B3D6D]">{faq.q}</p>
            <p className="mt-1">{faq.a}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

export function TermsPage() {
  return (
    <PageShell title="Terms & Conditions">
      <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
        <p>Welcome to Pathly Regional Logistics &amp; Route Intelligence Platform. By accessing this platform, you agree to the following terms:</p>
        <p><strong>1. Usage:</strong> This platform is intended for authorized personnel involved in logistics operations, disaster response, and infrastructure monitoring across the regional corridor.</p>
        <p><strong>2. Data Accuracy:</strong> While every effort is made to ensure data accuracy, Pathly does not guarantee the completeness or reliability of real-time telemetry data displayed on this platform.</p>
        <p><strong>3. Unauthorized Access:</strong> Unauthorized access to this platform is strictly prohibited and may result in legal action.</p>
        <p><strong>4. Limitation of Liability:</strong> Pathly Regional Command shall not be held liable for any decisions made based on the data provided through this platform.</p>
        <p><strong>5. Modifications:</strong> These terms may be updated from time to time without prior notice.</p>
      </div>
    </PageShell>
  );
}

export function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy">
      <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
        <p>Pathly Regional Logistics &amp; Route Intelligence Platform is committed to protecting the privacy of its users.</p>
        <p><strong>Information Collection:</strong> The platform collects operational data including vehicle locations, route telemetry, and user interaction logs for the purpose of logistics coordination and system improvement.</p>
        <p><strong>Data Usage:</strong> Collected data is used exclusively for logistics operations, route optimization, disaster response coordination, and system analytics.</p>
        <p><strong>Data Security:</strong> All data is transmitted over encrypted channels and stored in secure servers with access restricted to authorized personnel only.</p>
        <p><strong>Third Party Sharing:</strong> Data is not shared with third parties except as required by law or for inter-agency coordination during emergency operations.</p>
        <p><strong>Contact:</strong> For privacy-related inquiries, please use the Contact Us page.</p>
      </div>
    </PageShell>
  );
}

export function RTIPage() {
  return (
    <PageShell title="Right to Information">
      <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
        <p>In compliance with the Right to Information Act, 2005, Pathly Regional Command provides the following information:</p>
        <p><strong>Public Information Officer:</strong> Director, Pathly Regional Command</p>
        <p><strong>Address:</strong> Pathly Regional Command Office, Guwahati, Assam, India</p>
        <p><strong>Working Hours:</strong> Monday to Friday, 10:00 AM to 5:00 PM IST</p>
        <p><strong>Fee:</strong> Application fee of ₹10 may be submitted via Indian Postal Order or Demand Draft payable to Pathly Regional Command.</p>
        <p><strong>Response Time:</strong> Applications will be responded to within 30 days as per RTI Act provisions.</p>
        <p><strong>First Appeal:</strong> Appeals may be addressed to the Appellate Authority at the same office address within 30 days of the PIO response.</p>
      </div>
    </PageShell>
  );
}

export function CopyrightPage() {
  return (
    <PageShell title="Copyright Policy">
      <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
        <p>&copy; {new Date().getFullYear()} Pathly Regional Command. All rights reserved.</p>
        <p>The content on this platform, including text, graphics, logos, maps, and software, is the property of Pathly Regional Command and is protected by applicable copyright laws.</p>
        <p>No part of this platform may be reproduced, distributed, or transmitted in any form without prior written permission from Pathly Regional Command.</p>
        <p>Government data and information displayed on this platform may be used for official purposes subject to applicable provisions of the Indian Copyright Act, 1957.</p>
        <p>For permissions or inquiries regarding copyright, please use the Contact Us page.</p>
      </div>
    </PageShell>
  );
}

export function AccessibilityStatementPage() {
  return (
    <PageShell title="Accessibility Statement">
      <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
        <p>Pathly Regional Logistics &amp; Route Intelligence Platform is committed to ensuring digital accessibility for people with disabilities.</p>
        <p>We continually improve the user experience for everyone and apply the relevant accessibility standards (WCAG 2.1 Level AA).</p>
        <p><strong>Measures taken:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Semantic HTML structure with proper heading hierarchy</li>
          <li>Alt text for all meaningful images and maps</li>
          <li>Keyboard navigation support across all interactive elements</li>
          <li>Color contrast ratios meeting WCAG AA standards</li>
          <li>Screen reader compatibility for all major components</li>
          <li>Skip-to-content navigation link</li>
        </ul>
        <p>If you encounter any accessibility barriers, please report them via the Contact Us page.</p>
      </div>
    </PageShell>
  );
}

export function ScreenReaderPage() {
  return (
    <PageShell title="Screen Reader Access">
      <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
        <p>Pathly is designed to be compatible with assistive technologies including screen readers.</p>
        <p><strong>Supported Screen Readers:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>NVDA (NonVisual Desktop Access) — recommended for Windows</li>
          <li>JAWS (Job Access With Speech) — Windows</li>
          <li>VoiceOver — macOS and iOS (built-in)</li>
          <li>TalkBack — Android (built-in)</li>
        </ul>
        <p><strong>Best Experience:</strong> For the best screen reader experience, use the latest version of Chrome or Firefox with an up-to-date screen reader.</p>
        <p><strong>Keyboard Shortcuts:</strong> All map controls, navigation menus, and interactive elements are keyboard accessible using Tab, Enter, Escape, and Arrow keys.</p>
        <p>If you experience issues with screen reader access, please use the Contact Us page to report the issue.</p>
      </div>
    </PageShell>
  );
}

export function SitemapPage() {
  const pages = [
    { path: '/', label: 'Home / Dashboard' },
    { path: '/accessibility', label: 'Accessibility Map' },
    { path: '/routes', label: 'Route Planner' },
    { path: '/tracking', label: 'Vehicle Tracking' },
    { path: '/alerts', label: 'Alert Center' },
    { path: '/field-reports', label: 'Field Reports' },
    { path: '/analytics', label: 'Analytics' },
    { path: '/settings', label: 'Settings' },
    { path: '/login', label: 'Login' },
  ];
  const footerPages = [
    { path: '/about', label: 'About Pathly Network' },
    { path: '/vision-mission', label: 'Vision & Mission' },
    { path: '/contact', label: 'Contact Us' },
    { path: '/help', label: 'Help / FAQ' },
    { path: '/terms', label: 'Terms & Conditions' },
    { path: '/privacy', label: 'Privacy Policy' },
    { path: '/rti', label: 'Right to Information' },
    { path: '/copyright', label: 'Copyright Policy' },
    { path: '/accessibility-statement', label: 'Accessibility Statement' },
    { path: '/screen-reader', label: 'Screen Reader Access' },
    { path: '/sitemap', label: 'Sitemap' },
    { path: '/disclaimer', label: 'Disclaimer' },
  ];
  return (
    <PageShell title="Sitemap">
      <div className="space-y-4 text-sm">
        <div>
          <h2 className="font-bold text-[#0B3D6D] uppercase tracking-wide text-xs mb-2">Main Pages</h2>
          <ul className="space-y-1">
            {pages.map((p) => (
              <li key={p.path}>
                <a href={p.path} className="text-[#0B3D6D] hover:underline">{p.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-bold text-[#0B3D6D] uppercase tracking-wide text-xs mb-2">Footer Pages</h2>
          <ul className="space-y-1">
            {footerPages.map((p) => (
              <li key={p.path}>
                <a href={p.path} className="text-[#0B3D6D] hover:underline">{p.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageShell>
  );
}

export function DisclaimerPage() {
  return (
    <PageShell title="Disclaimer">
      <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
        <p>The information provided by Pathly Regional Logistics &amp; Route Intelligence Platform is for general informational purposes only.</p>
        <p>All data displayed on this platform, including road conditions, vehicle locations, weather telemetry, and route analytics, is sourced from various sensors, APIs, and field reports. While we strive for accuracy, we make no warranty of any kind about the completeness, reliability, or accuracy of this information.</p>
        <p>Any reliance you place on the information provided by this platform is strictly at your own risk. Pathly Regional Command shall not be held liable for any loss or damage arising from the use of this platform.</p>
        <p>The inclusion of any links or references to external websites does not imply endorsement or recommendation by Pathly Regional Command.</p>
        <p>This platform is intended for authorized operational use only and should not be used as the sole basis for critical logistics or emergency decisions without independent verification.</p>
      </div>
    </PageShell>
  );
}
