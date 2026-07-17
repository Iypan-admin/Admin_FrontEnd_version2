import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getAllStates, createCenter } from "../services/Api";

// ─── Step Config ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, title: "Partner Details",  icon: "👤", desc: "Basic partner & contact info" },
  { id: 2, title: "Centre Details",   icon: "🏢", desc: "Centre name & mode" },
  { id: 3, title: "Location Details", icon: "📍", desc: "State, city & address" },
  { id: 4, title: "Additional Info",  icon: "📎", desc: "Referral & documents" },
];

// ─── Initial Form State ───────────────────────────────────────────────────────
const INITIAL_FORM = {
  partnerName: "",
  contactPerson: "",
  mobileNumber: "",
  email: "",
  centreName: "",
  centreMode: "",
  stateId: "",
  stateName: "",
  city: "",
  address: "",
  pincode: "",
  referralCode: "",
  referralName: "",
  agreeTerms: false,
};

// ─── Validators ───────────────────────────────────────────────────────────────
const validateStep = (step, form) => {
  const errors = {};
  if (step === 1) {
    if (!form.partnerName.trim()) errors.partnerName = "Partner name is required";
    if (!form.contactPerson.trim()) errors.contactPerson = "Contact person is required";
    if (!form.mobileNumber.trim()) errors.mobileNumber = "Mobile number is required";
    else if (!/^[6-9]\d{9}$/.test(form.mobileNumber)) errors.mobileNumber = "Enter a valid 10-digit mobile number";
    if (!form.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email address";
  }
  if (step === 2) {
    if (!form.centreName.trim()) errors.centreName = "Centre name is required";
    if (!form.centreMode) errors.centreMode = "Please select a centre mode";
  }
  if (step === 3) {
    if (!form.city.trim()) errors.city = "City is required";
    if (!form.address.trim()) errors.address = "Address is required";
    if (!form.pincode.trim()) errors.pincode = "Pincode is required";
    else if (!/^\d{6}$/.test(form.pincode)) errors.pincode = "Enter a valid 6-digit pincode";
  }
  if (step === 4) {
    if (!form.agreeTerms) errors.agreeTerms = "Please accept the terms to proceed";
  }
  return errors;
};

// ─── Reusable Field Wrapper ───────────────────────────────────────────────────
const Field = ({ label, error, required, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-semibold text-gray-700">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-xs text-rose-500 flex items-center gap-1 mt-0.5">
        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {error}
      </p>
    )}
  </div>
);

const inputCls = (hasError) =>
  `w-full px-4 py-3 rounded-xl border text-sm transition-all duration-200 outline-none focus:ring-2 ${
    hasError
      ? "border-rose-400 focus:ring-rose-200 bg-rose-50"
      : "border-gray-200 focus:ring-indigo-200 focus:border-indigo-400 bg-white hover:border-gray-300"
  }`;

// ─── Main Component ───────────────────────────────────────────────────────────
const CentreRegistrationFormPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // States from DB
  const [states, setStates] = useState([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [statesError, setStatesError] = useState(null);

  // Submit states
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Layout
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true" ? "6rem" : "16rem";
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;

  // ── Effects ──
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleSidebarToggle = () => {
      const saved = localStorage.getItem("sidebarCollapsed");
      setSidebarWidth(saved === "true" ? "6rem" : "16rem");
    };
    window.addEventListener("sidebarToggle", handleSidebarToggle);
    handleSidebarToggle();
    return () => window.removeEventListener("sidebarToggle", handleSidebarToggle);
  }, []);

  useEffect(() => {
    const handler = (e) => setIsMobileMenuOpen(e.detail);
    window.addEventListener("mobileMenuStateChange", handler);
    return () => window.removeEventListener("mobileMenuStateChange", handler);
  }, []);

  // ── Fetch states from DB (not hardcoded) ──
  useEffect(() => {
    const fetchStates = async () => {
      setStatesLoading(true);
      setStatesError(null);
      try {
        const response = await getAllStates();
        const data = response?.data || response || [];
        const sorted = Array.isArray(data)
          ? [...data].sort((a, b) => (a.state_name || "").localeCompare(b.state_name || ""))
          : [];
        setStates(sorted);
      } catch (err) {
        console.error("Failed to fetch states:", err);
        setStatesError("Could not load states. Please try again.");
      } finally {
        setStatesLoading(false);
      }
    };
    fetchStates();
  }, []);

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent("toggleMobileMenu", { detail: newState }));
  };

  // ── Handlers ──
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleStateChange = (e) => {
    const stateId = e.target.value;
    const found = states.find((s) => String(s.state_id) === String(stateId));
    setForm((prev) => ({
      ...prev,
      stateId,
      stateName: found?.state_name || "",
    }));
    if (errors.state) setErrors((prev) => ({ ...prev, state: undefined }));
  };

  const handleNext = () => {
    const stepErrors = validateStep(currentStep, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setCurrentStep((s) => Math.min(s + 1, 4));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setErrors({});
    setCurrentStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    const stepErrors = validateStep(4, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    
    setSubmitLoading(true);
    setSubmitError(null);

    // Automatically resolve state ID based on centreMode (Online/Offline matching)
    let resolvedStateId = "";
    if (Array.isArray(states)) {
      const targetStateName = form.centreMode === "online" ? "Online" : "Offline";
      const foundState = states.find(
        (s) => s.state_name?.toLowerCase() === targetStateName.toLowerCase()
      );
      resolvedStateId = foundState?.state_id || "";
    }

    const payload = {
      centerName: form.centreName,
      stateId: resolvedStateId,
      partnerName: form.partnerName,
      contactPerson: form.contactPerson,
      mobileNumber: form.mobileNumber,
      emailAddress: form.email,
      centreMode: form.centreMode,
      city: form.city,
      completeAddress: form.address,
      pincode: form.pincode,
      referralCode: form.referralCode,
      referralName: form.referralName
    };

    try {
      await createCenter(payload, token);
      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting centre application:", err);
      setSubmitError(err.message || "Failed to submit centre application. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Main layout margin ──
  const contentMargin = isMobile ? "0" : sidebarWidth === "6rem" ? "96px" : "256px";

  // ── Success Screen ──
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex">
        <Navbar />
        <div className="flex-1 flex items-center justify-center transition-all duration-300" style={{ marginLeft: contentMargin }}>
          <div className="max-w-lg w-full mx-4 text-center">
            <div className="bg-white rounded-3xl shadow-2xl p-10 border border-gray-100">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
              <p className="text-gray-500 mb-2">
                Your Centre Registration Application has been recorded successfully.
              </p>
              <p className="text-sm text-indigo-600 font-medium mb-8">
                📋 Pending review — you'll be notified once approved.
              </p>
              <div className="bg-gray-50 rounded-2xl p-5 text-left mb-8 space-y-2">
                {[
                  ["Centre Name", form.centreName],
                  ["Partner", form.partnerName],
                  ["Mode", form.centreMode ? form.centreMode.charAt(0).toUpperCase() + form.centreMode.slice(1) : "-"],
                  ["Location", form.city && form.stateName ? `${form.city}, ${form.stateName}` : "-"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold text-gray-800">{value || "-"}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  const role = decodedToken?.role;
                  if (role === "franchise_master") navigate("/franchise-master");
                  else navigate("/");
                }}
                className="w-full py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Form ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex">
      <Navbar />

      <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: contentMargin }}>

        {/* ── Top Header Bar ── */}
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button onClick={toggleMobileMenu} className="lg:hidden p-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-all duration-200">
                  {isMobileMenuOpen ? (
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Centre Registration</h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Apply for a new ISML centre partnership</p>
                </div>
              </div>
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* ── Step Progress Bar ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
              <div className="flex items-center justify-between relative">
                {/* Connector line */}
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-100 z-0">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                  />
                </div>
                {STEPS.map((step) => {
                  const isDone = step.id < currentStep;
                  const isActive = step.id === currentStep;
                  return (
                    <div key={step.id} className="flex flex-col items-center gap-2 z-10 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-sm ${
                        isDone
                          ? "bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-green-200"
                          : isActive
                          ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-200 ring-4 ring-indigo-100"
                          : "bg-white border-2 border-gray-200 text-gray-400"
                      }`}>
                        {isDone ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : step.id}
                      </div>
                      <div className="text-center hidden sm:block">
                        <p className={`text-xs font-semibold ${isActive ? "text-indigo-700" : isDone ? "text-emerald-600" : "text-gray-400"}`}>
                          {step.title}
                        </p>
                        <p className="text-xs text-gray-400 hidden md:block">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="sm:hidden mt-4 text-center">
                <p className="text-sm font-semibold text-indigo-700">
                  {STEPS[currentStep - 1].icon} Step {currentStep}: {STEPS[currentStep - 1].title}
                </p>
              </div>
            </div>

            {/* ── Form Card ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Card header */}
              <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl">
                    {STEPS[currentStep - 1].icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{STEPS[currentStep - 1].title}</h2>
                    <p className="text-indigo-200 text-sm">{STEPS[currentStep - 1].desc}</p>
                  </div>
                </div>
              </div>

              {/* Form body */}
              <div className="p-6 sm:p-8 space-y-6">

                {/* ── STEP 1: Partner Details ── */}
                {currentStep === 1 && (
                  <div className="space-y-5">
                    <Field label="Partner / Organization Name" error={errors.partnerName} required>
                      <input
                        type="text"
                        name="partnerName"
                        id="field-partnerName"
                        value={form.partnerName}
                        onChange={handleChange}
                        placeholder="e.g. ABC Education Foundation"
                        className={inputCls(!!errors.partnerName)}
                      />
                    </Field>

                    <Field label="Contact Person Name" error={errors.contactPerson} required>
                      <input
                        type="text"
                        name="contactPerson"
                        id="field-contactPerson"
                        value={form.contactPerson}
                        onChange={handleChange}
                        placeholder="e.g. Rajesh Kumar"
                        className={inputCls(!!errors.contactPerson)}
                      />
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field label="Mobile Number" error={errors.mobileNumber} required>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">+91</span>
                          <input
                            type="tel"
                            name="mobileNumber"
                            id="field-mobileNumber"
                            value={form.mobileNumber}
                            onChange={handleChange}
                            placeholder="98XXXXXXXX"
                            maxLength={10}
                            className={`${inputCls(!!errors.mobileNumber)} pl-12`}
                          />
                        </div>
                      </Field>
                      <Field label="Email Address" error={errors.email} required>
                        <input
                          type="email"
                          name="email"
                          id="field-email"
                          value={form.email}
                          onChange={handleChange}
                          placeholder="example@domain.com"
                          className={inputCls(!!errors.email)}
                        />
                      </Field>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                      <svg className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-indigo-700">
                        This information will be used for official communication regarding your application.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── STEP 2: Centre Details ── */}
                {currentStep === 2 && (
                  <div className="space-y-5">
                    <Field label="Centre Name" error={errors.centreName} required>
                      <input
                        type="text"
                        name="centreName"
                        id="field-centreName"
                        value={form.centreName}
                        onChange={handleChange}
                        placeholder="e.g. ISML Coimbatore Centre"
                        className={inputCls(!!errors.centreName)}
                      />
                    </Field>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Centre Mode <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { value: "online",  label: "Online",  emoji: "💻", desc: "Fully virtual classes" },
                          { value: "offline", label: "Offline", emoji: "🏫", desc: "Physical classroom" },
                          { value: "hybrid",  label: "Hybrid",  emoji: "🔄", desc: "Both online & offline" },
                        ].map((mode) => (
                          <label
                            key={mode.value}
                            htmlFor={`mode-${mode.value}`}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                              form.centreMode === mode.value
                                ? "border-indigo-500 bg-indigo-50 shadow-sm"
                                : "border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/50"
                            }`}
                          >
                            <input
                              type="radio"
                              id={`mode-${mode.value}`}
                              name="centreMode"
                              value={mode.value}
                              checked={form.centreMode === mode.value}
                              onChange={handleChange}
                              className="sr-only"
                            />
                            <span className="text-2xl">{mode.emoji}</span>
                            <span className={`text-sm font-semibold ${form.centreMode === mode.value ? "text-indigo-700" : "text-gray-700"}`}>
                              {mode.label}
                            </span>
                            <span className="text-xs text-gray-500 text-center">{mode.desc}</span>
                            {form.centreMode === mode.value && (
                              <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </label>
                        ))}
                      </div>
                      {errors.centreMode && (
                        <p className="text-xs text-rose-500 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.centreMode}
                        </p>
                      )}
                    </div>

                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                      <div className="flex items-start gap-3">
                        <span className="text-amber-500 text-lg">⚠️</span>
                        <div>
                          <p className="text-sm font-semibold text-amber-700">Centre Mode Selection</p>
                          <p className="text-xs text-amber-600 mt-1">
                            This can be updated later after approval. Choose the primary mode of operation.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: Location Details ── */}
                {currentStep === 3 && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field label="City" error={errors.city} required>
                        <input
                          type="text"
                          name="city"
                          id="field-city"
                          value={form.city}
                          onChange={handleChange}
                          placeholder="e.g. Coimbatore"
                          className={inputCls(!!errors.city)}
                        />
                      </Field>
                    </div>

                    <Field label="Full Address" error={errors.address} required>
                      <textarea
                        name="address"
                        id="field-address"
                        value={form.address}
                        onChange={handleChange}
                        placeholder="Door No, Street Name, Area, Landmark..."
                        rows={3}
                        className={`${inputCls(!!errors.address)} resize-none`}
                      />
                    </Field>

                    <Field label="Pincode" error={errors.pincode} required>
                      <input
                        type="text"
                        name="pincode"
                        id="field-pincode"
                        value={form.pincode}
                        onChange={handleChange}
                        placeholder="6-digit pincode"
                        maxLength={6}
                        className={`${inputCls(!!errors.pincode)} max-w-xs`}
                      />
                    </Field>

                    {form.city && (
                      <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-emerald-700">
                          📍 {form.city}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── STEP 4: Additional Info ── */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    {/* Referral Details */}
                    <div>
                      <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xs">🎯</span>
                        Referral Details
                        <span className="text-xs font-normal text-gray-400">(Optional)</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Field label="Referral Code">
                          <input
                            type="text"
                            name="referralCode"
                            id="field-referralCode"
                            value={form.referralCode}
                            onChange={handleChange}
                            placeholder="e.g. ISML-REF-001"
                            className={inputCls(false)}
                          />
                        </Field>
                        <Field label="Referred By">
                          <input
                            type="text"
                            name="referralName"
                            id="field-referralName"
                            value={form.referralName}
                            onChange={handleChange}
                            placeholder="Name of the referrer"
                            className={inputCls(false)}
                          />
                        </Field>
                      </div>
                    </div>

                    {/* Documents — UI placeholder only, no upload logic in Step 4 */}
                    <div>
                      <h3 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs">📎</span>
                        Required Documents
                        <span className="text-xs font-normal text-gray-400">(if applicable)</span>
                      </h3>
                      <p className="text-xs text-gray-500 mb-3">
                        Document upload will be available after the registration workflow is approved. You may attach documents in the next step.
                      </p>
                      {/* Placeholder UI */}
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-gray-500">Document upload coming soon</p>
                          <p className="text-xs text-gray-400">Partnership agreement, identity proof, etc.</p>
                          <span className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full border border-indigo-100">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Available after approval workflow setup
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Review Summary */}
                    <div className="bg-gradient-to-br from-slate-50 to-indigo-50 rounded-2xl border border-indigo-100 p-5">
                      <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Application Summary
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          ["Partner", form.partnerName],
                          ["Contact", form.contactPerson],
                          ["Mobile", form.mobileNumber ? `+91 ${form.mobileNumber}` : "-"],
                          ["Email", form.email],
                          ["Centre Name", form.centreName],
                          ["Mode", form.centreMode ? form.centreMode.charAt(0).toUpperCase() + form.centreMode.slice(1) : "-"],
                          ["Location", form.city || "-"],
                          ["Pincode", form.pincode || "-"],
                        ].map(([label, value]) => (
                          <div key={label} className="flex flex-col gap-0.5">
                            <span className="text-xs text-gray-400 font-medium">{label}</span>
                            <span className="text-sm font-semibold text-gray-800 truncate">{value || "-"}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Terms checkbox */}
                    <div className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                      errors.agreeTerms ? "border-rose-300 bg-rose-50" : "border-gray-200 bg-gray-50"
                    }`}>
                      <input
                        type="checkbox"
                        id="field-agreeTerms"
                        name="agreeTerms"
                        checked={form.agreeTerms}
                        onChange={handleChange}
                        className="mt-0.5 w-4 h-4 rounded accent-indigo-600 cursor-pointer flex-shrink-0"
                      />
                      <label htmlFor="field-agreeTerms" className="text-sm text-gray-700 cursor-pointer leading-relaxed">
                        I confirm that all the information provided is accurate. I understand this is a registration application and{" "}
                        <span className="font-semibold text-indigo-700">final approval is subject to ISML review</span>.
                      </label>
                    </div>
                    {errors.agreeTerms && (
                      <p className="text-xs text-rose-500 flex items-center gap-1 -mt-4">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.agreeTerms}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* ── Footer navigation ── */}
              <div className="px-6 sm:px-8 pb-6 sm:pb-8">
                <div className="flex items-center justify-between pt-5 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      currentStep === 1
                        ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>

                  {/* Step dots */}
                  <div className="flex items-center gap-1.5">
                    {STEPS.map((s) => (
                      <div
                        key={s.id}
                        className={`transition-all duration-300 rounded-full ${
                          s.id === currentStep ? "w-6 h-2 bg-indigo-600"
                            : s.id < currentStep ? "w-2 h-2 bg-emerald-400"
                            : "w-2 h-2 bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>

                  {submitError && (
                    <p className="text-xs text-rose-500 font-semibold mb-2">{submitError}</p>
                  )}
                  {currentStep < 4 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      id="btn-next-step"
                      className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-indigo-100"
                    >
                      Next
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitLoading}
                      id="btn-submit-application"
                      className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-505 to-green-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-600 hover:to-green-700 transition-all duration-200 shadow-lg shadow-green-100 disabled:opacity-50"
                    >
                      {submitLoading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Submit Application
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-gray-400 pb-4">
              Step {currentStep} of {STEPS.length} — Fill all required fields to proceed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CentreRegistrationFormPage;
