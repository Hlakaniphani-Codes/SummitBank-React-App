import React, { useState, useRef, useEffect } from 'react';
import { register } from '../api'; // <-- IMPORT

const EnrollPage = () => {
  // ----- STEP STATE -----
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // ----- FORM DATA -----
  const [formData, setFormData] = useState({
    // Step 1
    firstName: '',
    middleName: '',
    lastName: '',
    dob: '',
    email: '',
    phone: '',
    // Step 2
    street: '',
    apartment: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    // Step 3
    occupation: '',
    employer: '',
    income: '',
    sourceOfFunds: '',
    // Step 4
    ssn: '',
    accountType: '',
    accountCurrency: 'USD',
    // KYC
    docType: 'passport', // passport | stateid | driverslicense
    // Step 5
    pin: ['', '', '', ''],
    password: '',
    confirmPassword: '',
    terms: false,
  });

  // ----- FILE UPLOADS (KYC) -----
  const [files, setFiles] = useState({});
  const [filePreviews, setFilePreviews] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ----- STEP NAVIGATION -----
  const goToStep = (step) => {
    if (step < 1 || step > totalSteps) return;
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ----- PIN INPUT HANDLING -----
  const pinRefs = [useRef(), useRef(), useRef(), useRef()];
  const handlePinChange = (index, value) => {
    const newPin = [...formData.pin];
    newPin[index] = value.replace(/\D/g, '');
    setFormData({ ...formData, pin: newPin });
    // Auto-focus next
    if (value && index < 3) {
      pinRefs[index + 1].current.focus();
    }
  };
  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !formData.pin[index] && index > 0) {
      pinRefs[index - 1].current.focus();
    }
  };

  // ----- PASSWORD STRENGTH -----
  const [passwordStrength, setPasswordStrength] = useState(0);
  const checkPasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    setPasswordStrength(score / 4 * 100);
  };

  // ----- KYC: Document Type Switching -----
  const handleDocTypeChange = (type) => {
    setFormData({ ...formData, docType: type });
  };

  // ----- FILE UPLOAD HANDLING -----
  const handleFileUpload = (uploadId, file) => {
    if (!file) return;
    // Max size 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10 MB.');
      return;
    }
    setFiles({ ...files, [uploadId]: file });
    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setFilePreviews({ ...filePreviews, [uploadId]: e.target.result });
    };
    reader.readAsDataURL(file);
  };

  const removeFile = (uploadId) => {
    const newFiles = { ...files };
    delete newFiles[uploadId];
    setFiles(newFiles);
    const newPreviews = { ...filePreviews };
    delete newPreviews[uploadId];
    setFilePreviews(newPreviews);
  };

  // ----- KYC VALIDATION -----
  const validateKyc = () => {
    const docType = formData.docType;
    let requiredUploads = [];
    if (docType === 'passport') {
      requiredUploads = ['passport_photo', 'passport_info'];
    } else if (docType === 'stateid') {
      requiredUploads = ['stateid_front', 'stateid_back'];
    } else if (docType === 'driverslicense') {
      requiredUploads = ['license_front', 'license_back'];
    }
    for (let id of requiredUploads) {
      if (!files[id]) return false;
    }
    return true;
  };

  // ----- STEP VALIDATION -----
  const validateStep = (step) => {
    // Step 4 has KYC validation
    if (step === 4) {
      return validateKyc();
    }
    return true;
  };

  const goToStepWithValidation = (step) => {
    if (step === 5) {
      if (!validateKyc()) {
        alert('Please complete all KYC uploads before proceeding.');
        return;
      }
    }
    goToStep(step);
  };

  // ----- FORM SUBMIT (FIXED) -----
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.terms) {
      alert('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        dob: formData.dob,
        email: formData.email,
        phone: formData.phone,
        street: formData.street,
        apartment: formData.apartment,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        country: formData.country,
        occupation: formData.occupation,
        employer: formData.employer,
        income: formData.income,
        sourceOfFunds: formData.sourceOfFunds,
        ssn: formData.ssn,
        accountType: formData.accountType,
        accountCurrency: formData.accountCurrency,
        docType: formData.docType,
        pin: formData.pin.join(''), // convert to string
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        terms: formData.terms,
      };

      // Use the imported register function
      const data = await register(payload);

      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      alert('✅ Account created successfully!\n\nWelcome to Summit Shares!');
      window.location.href = '/dashboard';
    } catch (err) {
      alert(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== HELPER: Step indicator class =====
  const getStepDotClass = (step) => {
    if (step <= currentStep) {
      return 'circle w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-brand-dark bg-brand-dark text-white';
    } else {
      return 'circle w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-brand-border bg-white text-brand-slateText';
    }
  };

  const getStepLabelClass = (step) => {
    return step <= currentStep
      ? 'text-[8px] font-bold uppercase tracking-wider ml-1 text-brand-dark hidden sm:inline'
      : 'text-[8px] font-bold uppercase tracking-wider ml-1 text-brand-slateText hidden sm:inline';
  };

  // ===== RENDER STEP CONTENT =====
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <div className="mb-5">
              <h3 className="text-lg font-bold text-brand-dark">Personal Details</h3>
              <p className="text-brand-slateText text-xs">Please provide your legal name as it appears on official documents</p>
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label>First Name <span className="required">*</span></label>
                <input type="text" placeholder="Enter your first name" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Middle Name <span className="text-brand-slateText font-normal text-[10px]">(Optional)</span></label>
                <input type="text" placeholder="Enter your middle name" value={formData.middleName} onChange={e => setFormData({...formData, middleName: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Last Name <span className="required">*</span></label>
                <input type="text" placeholder="Enter your last name" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Date of Birth <span className="required">*</span></label>
                <input type="date" required value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Email Address <span className="required">*</span></label>
                <input type="email" placeholder="email@example.com" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Phone Number <span className="required">*</span></label>
                <input type="tel" placeholder="+1 (234) 567-8901" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end items-center mt-4 pt-4 border-t border-brand-border">
              <button type="button" onClick={() => goToStep(2)} className="bg-brand-dark hover:bg-neutral-900 text-white font-bold px-8 py-2.5 rounded-sm text-xs uppercase tracking-wider transition">Next</button>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <div className="mb-5">
              <h3 className="text-lg font-bold text-brand-dark">Address Information</h3>
              <p className="text-brand-slateText text-xs">We need your current residential address</p>
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label>Street Address <span className="required">*</span></label>
                <input type="text" placeholder="123 Main Street" required value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} />
              </div>
              <div className="form-field">
                <label>House / Apartment Number</label>
                <input type="text" placeholder="Apt 4B" value={formData.apartment} onChange={e => setFormData({...formData, apartment: e.target.value})} />
              </div>
              <div className="form-field">
                <label>City <span className="required">*</span></label>
                <input type="text" placeholder="Enter your city" required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
              </div>
              <div className="form-field">
                <label>State / Province <span className="required">*</span></label>
                <input type="text" placeholder="Enter state or province" required value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Zip / Postal Code <span className="required">*</span></label>
                <input type="text" placeholder="Enter zip code" required value={formData.zip} onChange={e => setFormData({...formData, zip: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Country <span className="required">*</span></label>
                <select required value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})}>
                  <option value="US">🇺🇸 United States</option>
                  <option value="GB">🇬🇧 United Kingdom</option>
                  <option value="CA">🇨🇦 Canada</option>
                  <option value="AU">🇦🇺 Australia</option>
                  <option value="ZA">🇿🇦 South Africa</option>
                  <option value="NG">🇳🇬 Nigeria</option>
                  <option value="KE">🇰🇪 Kenya</option>
                  <option value="IN">🇮🇳 India</option>
                  <option value="DE">🇩🇪 Germany</option>
                  <option value="FR">🇫🇷 France</option>
                  <option value="AE">🇦🇪 United Arab Emirates</option>
                  <option value="SG">🇸🇬 Singapore</option>
                </select>
              </div>
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-brand-border">
              <button type="button" onClick={() => goToStep(1)} className="border border-brand-border hover:bg-slate-50 text-brand-dark font-bold px-6 py-2.5 rounded-sm text-xs uppercase tracking-wider transition">Previous</button>
              <button type="button" onClick={() => goToStep(3)} className="bg-brand-dark hover:bg-neutral-900 text-white font-bold px-8 py-2.5 rounded-sm text-xs uppercase tracking-wider transition">Next</button>
            </div>
          </>
        );
      case 3:
        return (
          <>
            <div className="mb-5">
              <h3 className="text-lg font-bold text-brand-dark">Employment Information</h3>
              <p className="text-brand-slateText text-xs">Tell us about your occupation and income</p>
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label>Occupation <span className="required">*</span></label>
                <select required value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})}>
                  <option value="">Select type of employment</option>
                  <option value="employed">Employed (Full-Time)</option>
                  <option value="part-time">Employed (Part-Time)</option>
                  <option value="self-employed">Self-Employed</option>
                  <option value="business">Business Owner</option>
                  <option value="student">Student</option>
                  <option value="retired">Retired</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-field">
                <label>Employer Name</label>
                <input type="text" placeholder="Enter employer name" value={formData.employer} onChange={e => setFormData({...formData, employer: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Annual Income Range <span className="required">*</span></label>
                <select required value={formData.income} onChange={e => setFormData({...formData, income: e.target.value})}>
                  <option value="">Select salary range</option>
                  <option value="under-25k">Under $25,000</option>
                  <option value="25-50k">$25,000 – $50,000</option>
                  <option value="50-75k">$50,000 – $75,000</option>
                  <option value="75-100k">$75,000 – $100,000</option>
                  <option value="100-150k">$100,000 – $150,000</option>
                  <option value="150-250k">$150,000 – $250,000</option>
                  <option value="over-250k">Over $250,000</option>
                </select>
              </div>
              <div className="form-field">
                <label>Source of Funds <span className="required">*</span></label>
                <select required value={formData.sourceOfFunds} onChange={e => setFormData({...formData, sourceOfFunds: e.target.value})}>
                  <option value="">Select source</option>
                  <option value="salary">Salary / Wages</option>
                  <option value="business">Business Income</option>
                  <option value="investments">Investments</option>
                  <option value="inheritance">Inheritance</option>
                  <option value="savings">Savings</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-brand-border">
              <button type="button" onClick={() => goToStep(2)} className="border border-brand-border hover:bg-slate-50 text-brand-dark font-bold px-6 py-2.5 rounded-sm text-xs uppercase tracking-wider transition">Previous</button>
              <button type="button" onClick={() => goToStep(4)} className="bg-brand-dark hover:bg-neutral-900 text-white font-bold px-8 py-2.5 rounded-sm text-xs uppercase tracking-wider transition">Next</button>
            </div>
          </>
        );
      case 4:
        return (
          <>
            <div className="mb-5">
              <h3 className="text-lg font-bold text-brand-dark">Banking &amp; Identity Verification</h3>
              <p className="text-brand-slateText text-xs">Set up your account preferences and verify your identity</p>
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label>SSN / SIN (or equivalent) <span className="required">*</span></label>
                <input type="text" placeholder="XXX-XX-XXXX" required value={formData.ssn} onChange={e => setFormData({...formData, ssn: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Account Type <span className="required">*</span></label>
                <select required value={formData.accountType} onChange={e => setFormData({...formData, accountType: e.target.value})}>
                  <option value="">Please select account type</option>
                  <option value="checking">Checking Account</option>
                  <option value="savings">Savings Account</option>
                  <option value="business">Business Account</option>
                  <option value="premium">Premium Account</option>
                  <option value="fixed">Fixed Deposit</option>
                  <option value="investment">Investment Account</option>
                </select>
              </div>
              <div className="form-field">
                <label>Account Currency <span className="required">*</span></label>
                <select required value={formData.accountCurrency} onChange={e => setFormData({...formData, accountCurrency: e.target.value})}>
                  <option value="USD">🇺🇸 America (United States) Dollars – USD</option>
                  <option value="EUR">🇪🇺 Euro – EUR</option>
                  <option value="GBP">🇬🇧 British Pound – GBP</option>
                  <option value="CAD">🇨🇦 Canadian Dollar – CAD</option>
                  <option value="AUD">🇦🇺 Australian Dollar – AUD</option>
                  <option value="ZAR">🇿🇦 South African Rand – ZAR</option>
                  <option value="NGN">🇳🇬 Nigerian Naira – NGN</option>
                  <option value="KES">🇰🇪 Kenyan Shilling – KES</option>
                  <option value="INR">🇮🇳 Indian Rupee – INR</option>
                  <option value="AED">🇦🇪 UAE Dirham – AED</option>
                  <option value="SGD">🇸🇬 Singapore Dollar – SGD</option>
                </select>
              </div>

              {/* KYC SECTION */}
              <div className="mt-4 pt-4 border-t border-brand-border">
                <h4 className="text-md font-bold text-brand-dark mb-2">Identity Verification (KYC)</h4>
                <p className="text-brand-slateText text-xs mb-3">Which government‑issued identification would you like to use for verification?</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div
                    className={`doc-type-card border rounded-sm p-3 text-center flex flex-col items-center gap-2 cursor-pointer ${formData.docType === 'passport' ? 'selected border-brand-gold bg-[#FDFBF7]' : 'border-brand-border'}`}
                    onClick={() => handleDocTypeChange('passport')}
                  >
                    <div className="icon-wrapper w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-brand-dark">
                      <i className="fas fa-passport text-xl"></i>
                    </div>
                    <span className="font-bold text-brand-dark text-sm">Passport</span>
                  </div>
                  <div
                    className={`doc-type-card border rounded-sm p-3 text-center flex flex-col items-center gap-2 cursor-pointer ${formData.docType === 'stateid' ? 'selected border-brand-gold bg-[#FDFBF7]' : 'border-brand-border'}`}
                    onClick={() => handleDocTypeChange('stateid')}
                  >
                    <div className="icon-wrapper w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-brand-dark">
                      <i className="fas fa-id-card text-xl"></i>
                    </div>
                    <span className="font-bold text-brand-dark text-sm">State ID</span>
                  </div>
                  <div
                    className={`doc-type-card border rounded-sm p-3 text-center flex flex-col items-center gap-2 cursor-pointer ${formData.docType === 'driverslicense' ? 'selected border-brand-gold bg-[#FDFBF7]' : 'border-brand-border'}`}
                    onClick={() => handleDocTypeChange('driverslicense')}
                  >
                    <div className="icon-wrapper w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-brand-dark">
                      <i className="fas fa-id-card-clip text-xl"></i>
                    </div>
                    <span className="font-bold text-brand-dark text-sm">Driver’s License</span>
                  </div>
                </div>

                {/* Dynamic upload fields */}
                <div id="kycUploadsContainer">
                  {/* Passport */}
                  {formData.docType === 'passport' && (
                    <div>
                      <p className="text-xs text-brand-slateText mb-2">Please upload a clear photo of your passport photo page and the information page.</p>
                      <FileUploadField
                        label="Upload Passport Photo"
                        uploadId="passport_photo"
                        file={files['passport_photo']}
                        preview={filePreviews['passport_photo']}
                        onFileChange={(file) => handleFileUpload('passport_photo', file)}
                        onRemove={() => removeFile('passport_photo')}
                        required
                      />
                      <FileUploadField
                        label="Upload Passport Information Page"
                        uploadId="passport_info"
                        file={files['passport_info']}
                        preview={filePreviews['passport_info']}
                        onFileChange={(file) => handleFileUpload('passport_info', file)}
                        onRemove={() => removeFile('passport_info')}
                        required
                      />
                    </div>
                  )}
                  {/* State ID */}
                  {formData.docType === 'stateid' && (
                    <div>
                      <p className="text-xs text-brand-slateText mb-2">Please upload a clear photo of the front and back of your State ID card.</p>
                      <FileUploadField
                        label="Upload Front of ID"
                        uploadId="stateid_front"
                        file={files['stateid_front']}
                        preview={filePreviews['stateid_front']}
                        onFileChange={(file) => handleFileUpload('stateid_front', file)}
                        onRemove={() => removeFile('stateid_front')}
                        required
                      />
                      <FileUploadField
                        label="Upload Back of ID"
                        uploadId="stateid_back"
                        file={files['stateid_back']}
                        preview={filePreviews['stateid_back']}
                        onFileChange={(file) => handleFileUpload('stateid_back', file)}
                        onRemove={() => removeFile('stateid_back')}
                        required
                      />
                    </div>
                  )}
                  {/* Driver's License */}
                  {formData.docType === 'driverslicense' && (
                    <div>
                      <p className="text-xs text-brand-slateText mb-2">Please upload a clear photo of the front and back of your driver’s license.</p>
                      <FileUploadField
                        label="Upload Front of License"
                        uploadId="license_front"
                        file={files['license_front']}
                        preview={filePreviews['license_front']}
                        onFileChange={(file) => handleFileUpload('license_front', file)}
                        onRemove={() => removeFile('license_front')}
                        required
                      />
                      <FileUploadField
                        label="Upload Back of License"
                        uploadId="license_back"
                        file={files['license_back']}
                        preview={filePreviews['license_back']}
                        onFileChange={(file) => handleFileUpload('license_back', file)}
                        onRemove={() => removeFile('license_back')}
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-brand-border">
              <button type="button" onClick={() => goToStep(3)} className="border border-brand-border hover:bg-slate-50 text-brand-dark font-bold px-6 py-2.5 rounded-sm text-xs uppercase tracking-wider transition">Previous</button>
              <button type="button" onClick={() => goToStepWithValidation(5)} className="bg-brand-dark hover:bg-neutral-900 text-white font-bold px-8 py-2.5 rounded-sm text-xs uppercase tracking-wider transition">Next</button>
            </div>
          </>
        );
      case 5:
        return (
          <>
            <div className="mb-5">
              <h3 className="text-lg font-bold text-brand-dark">Secure Your Account</h3>
              <p className="text-brand-slateText text-xs">Create a strong password and set up your security PIN</p>
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label>2FA PIN (4 digits) <span className="required">*</span></label>
                <div className="flex gap-2">
                  {[0,1,2,3].map((idx) => (
                    <input
                      key={idx}
                      ref={pinRefs[idx]}
                      type="password"
                      maxLength="1"
                      className="pin-digit w-12 h-12 text-center text-lg font-bold border-2 border-brand-border rounded-sm bg-slate-50 focus:outline-none focus:border-brand-gold transition"
                      value={formData.pin[idx] || ''}
                      onChange={(e) => handlePinChange(idx, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(idx, e)}
                    />
                  ))}
                </div>
                <p className="text-brand-slateText text-[10px] mt-1">Your PIN will be required to authorize transactions</p>
              </div>

              <div className="form-field">
                <label>Password <span className="required">*</span></label>
                <input
                  type="password"
                  placeholder="Create a strong password"
                  required
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({...formData, password: e.target.value});
                    checkPasswordStrength(e.target.value);
                  }}
                />
                <div className="strength-bar">
                  <div className="fill" style={{ width: passwordStrength + '%', background: passwordStrength < 25 ? '#D94352' : passwordStrength < 50 ? '#E8A838' : passwordStrength < 75 ? '#C9A84C' : '#2D9B4E' }}></div>
                </div>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  <span className="text-[10px] text-brand-slateText bg-slate-100 px-2 py-0.5 rounded-sm flex items-center gap-1">
                    <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                    8+ characters
                  </span>
                  <span className="text-[10px] text-brand-slateText bg-slate-100 px-2 py-0.5 rounded-sm flex items-center gap-1">
                    <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                    Uppercase & lowercase
                  </span>
                  <span className="text-[10px] text-brand-slateText bg-slate-100 px-2 py-0.5 rounded-sm flex items-center gap-1">
                    <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                    Number & symbol
                  </span>
                </div>
              </div>

              <div className="form-field">
                <label>Confirm Password <span className="required">*</span></label>
                <input
                  type="password"
                  placeholder="Confirm your password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                />
              </div>

              <div className="form-field">
                <label>Terms & Conditions</label>

                {/* Round "Accept all" button */}
                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    aria-label="Accept all terms and conditions"
                    onClick={() => setFormData({ ...formData, terms: true })}
                    className="rounded-full w-12 h-12 flex items-center justify-center transition"
                    style={{
                      background: formData.terms ? '#2D9B4E' : '#e8e2d9',
                      color: formData.terms ? '#fff' : '#5a5a5a',
                      border: formData.terms ? '2px solid #2D9B4E' : '2px solid #e8e2d9',
                      boxShadow: formData.terms ? '0 6px 18px rgba(45,155,78,0.25)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <i className={formData.terms ? 'fas fa-check' : 'fas fa-circle-check'}></i>
                  </button>

                  <div className="flex-1">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="termsCheck"
                        className="mt-0.5 w-4 h-4 text-brand-dark border-brand-border rounded-sm focus:ring-brand-gold cursor-pointer"
                        checked={formData.terms}
                        onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
                      />
                      <label htmlFor="termsCheck" className="text-xs text-brand-slateText cursor-pointer">
                        I agree to the <a href="#" className="text-brand-gold font-semibold hover:underline">Terms of Service</a> and <a href="#" className="text-brand-gold font-semibold hover:underline">Privacy Policy</a>
                      </label>
                    </div>

                    <p className="text-[10px] text-brand-slateText mt-1">
                      Tap the round button to accept both T&amp;C and Privacy Policy.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-brand-border">
              <button type="button" onClick={() => goToStep(4)} className="border border-brand-border hover:bg-slate-50 text-brand-dark font-bold px-6 py-2.5 rounded-sm text-xs uppercase tracking-wider transition">Previous</button>
              <button type="submit" onClick={handleSubmit} disabled={isSubmitting} className="bg-brand-gold hover:bg-brand-goldLight text-white font-bold px-8 py-2.5 rounded-sm text-xs uppercase tracking-wider transition shadow-md disabled:opacity-70">
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>

            <p className="text-center text-xs text-brand-slateText mt-4">
              Already have an account? <a href="/login" className="text-brand-gold font-semibold hover:underline">Sign in</a>
            </p>
          </>
        );
      default:
        return null;
    }
  };

  // ===== RENDER =====
  return (
    <div className="min-h-screen flex flex-col bg-white font-sans antialiased text-slate-800 corporate-pattern">

      {/* Top gold bar */}
      <div className="bg-brand-gold h-[5px] w-full"></div>

      {/* Info strip */}
      <div className="bg-white border-b border-brand-border text-brand-dark py-2 text-[10px] tracking-widest text-center uppercase font-semibold">
        Summit Shares &bull; Global Digital Corporate &amp; Retail Finance
      </div>

      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-brand-border shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 shrink-0">
            <svg className="logo-svg" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 30 L30 10 L50 30 L40 30 L30 18 L20 30 L10 30Z" fill="#C9A84C" />
              <path d="M70 30 L90 10 L110 30 L100 30 L90 18 L80 30 L70 30Z" fill="#C9A84C" />
              <rect x="32" y="24" width="2" height="6" fill="#C9A84C" />
              <rect x="34" y="26" width="2" height="4" fill="#C9A84C" />
              <rect x="36" y="28" width="2" height="2" fill="#C9A84C" />
              <text x="46" y="26" fontFamily="Montserrat, sans-serif" fontWeight="800" fontSize="20" fill="#0B0B0B" letterSpacing="2">SUMMIT</text>
              <text x="42" y="36" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="7" fill="#5A5A5A" letterSpacing="2">SHARES</text>
              <circle cx="120" cy="20" r="4" fill="#C9A84C" opacity="0.3" />
            </svg>
          </a>

          <div className="flex items-center gap-4 sm:gap-6 text-xs font-bold uppercase tracking-wider text-brand-slateText">
            <a href="/support" className="hover:text-brand-gold transition">Contact</a>
            <a href="/login" className="hover:text-brand-gold transition">Sign in</a>
          </div>
        </div>
      </header>

      {/* Main content: left panel (desktop) + right form */}
      <main className="flex-1 grid lg:grid-cols-12">

        {/* Left panel (hidden on mobile) */}
        <section className="hidden lg:flex lg:col-span-5 enroll-hero-bg p-12 flex-col justify-between text-white relative" style={{ backgroundImage: 'linear-gradient(rgba(11,11,11,0.85), rgba(11,11,11,0.92)), url("fill.jpg")', backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-white/10 flex items-center justify-center text-brand-goldLight text-sm font-black rounded-sm">SS</div>
              <div>
                <span className="block text-lg font-bold tracking-tight text-white">Summit Shares</span>
                <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">Global Digital Finance</span>
              </div>
            </div>
            <div className="space-y-4 max-w-md z-10">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-goldLight bg-white/10 px-3 py-1 rounded-full inline-block border border-white/10">Security First</span>
              <h2 className="text-3xl font-extrabold tracking-tight leading-tight">Start Banking with Us</h2>
              <p className="text-slate-300 text-xs leading-relaxed">Create your Summit Shares account in just a few steps and enjoy our full range of financial services.</p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-brand-goldLight flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Secure Banking Platform</p>
                  <p className="text-slate-400 text-xs">Industry-leading security protocols to keep your funds safe</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-brand-goldLight flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Fast Transfers</p>
                  <p className="text-slate-400 text-xs">Send and receive money quickly to anyone, anywhere</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-brand-goldLight flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">24/7 Account Access</p>
                  <p className="text-slate-400 text-xs">Manage your finances anytime, anywhere on any device</p>
                </div>
              </div>
            </div>
          </div>

          <div className="z-10 bg-brand-dark/80 p-6 rounded-sm border border-neutral-800 max-w-sm">
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
              <span className="text-slate-300">Step <span id="currentStepDisplay">{currentStep}</span> of {totalSteps}</span>
              <span className="text-brand-goldLight">{Math.round((currentStep / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-brand-gold h-full transition-all duration-500" style={{ width: `${(currentStep / totalSteps) * 100}%` }}></div>
            </div>
          </div>
        </section>

        {/* Right panel – form */}
        <section className="col-span-12 lg:col-span-7 bg-white p-4 sm:p-6 lg:p-12 flex flex-col max-w-3xl mx-auto w-full">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-brand-dark tracking-tight sm:text-3xl">Create Your Account</h1>
            <p className="text-brand-slateText text-xs mt-1">Step <span id="stepNumberDisplay">{currentStep}</span> of {totalSteps}</p>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-1 sm:gap-2 mb-6 step-indicator flex-nowrap overflow-x-auto">
            {[1,2,3,4,5].map((step) => (
              <React.Fragment key={step}>
                <div className="step-dot flex items-center shrink-0" data-step={step}>
                  <div className={getStepDotClass(step)}>{step}</div>
                  <span className={getStepLabelClass(step)}>
                    {step === 1 ? 'Personal' : step === 2 ? 'Address' : step === 3 ? 'Employment' : step === 4 ? 'Banking' : 'Security'}
                  </span>
                </div>
                {step < 5 && (
                  <div className={`w-6 sm:w-8 h-0.5 ${step < currentStep ? 'bg-brand-dark' : 'bg-brand-border'} step-line shrink-0`}></div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step content */}
          <form onSubmit={handleSubmit}>
            {renderStepContent()}
          </form>
        </section>
      </main>

      {/* Trust badges */}
      <section className="py-6 bg-white border-t border-brand-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 text-xs font-semibold uppercase tracking-wider text-brand-slateText">
            <span className="flex items-center gap-2 trust-badge">
              <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              FDIC Insured
            </span>
            <span className="flex items-center gap-2 trust-badge">
              <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              256-bit Encryption
            </span>
            <span className="flex items-center gap-2 trust-badge">
              <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
              Global 24/7 Support
            </span>
            <span className="flex items-center gap-2 trust-badge">
              <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              Regulated & Compliant
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-dark border-t border-neutral-800 text-neutral-400 py-8 text-xs">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap justify-center gap-6 font-semibold">
              <a href="#" className="hover:text-white transition">Privacy</a>
              <a href="#" className="hover:text-white transition">Security</a>
              <a href="#" className="hover:text-white transition">Accessibility</a>
              <a href="#" className="hover:text-white transition">Terms of use</a>
            </div>
            <div className="text-neutral-500 font-medium">&copy; 2026 Summit Shares. All rights reserved.</div>
          </div>
        </div>
      </footer>

      {/* Font Awesome for icons */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />

      {/* Additional styles for file uploads, etc. (same as HTML) */}
      <style>{`
        /* All the custom CSS from the HTML – inline here for brevity */
        .enroll-hero-bg { background-image: linear-gradient(rgba(11,11,11,0.85), rgba(11,11,11,0.92)), url('fill.jpg'); background-size: cover; background-position: center; }
        .step-dot .circle { transition: all 0.3s ease; }
        .step-content { display: none; animation: fadeIn 0.4s ease; }
        .step-content.active { display: block; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .doc-type-card { transition: all 0.3s ease; cursor: pointer; border: 2px solid transparent; }
        .doc-type-card.selected { border-color: #C9A84C; background: #FDFBF7; box-shadow: 0 4px 12px rgba(201,168,76,0.15); }
        .doc-type-card .icon-wrapper { transition: all 0.3s ease; }
        .doc-type-card.selected .icon-wrapper { background: #C9A84C; color: white; }
        .form-field { width: 100%; margin-bottom: 1rem; }
        .form-field label { display: block; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #0B0B0B; margin-bottom: 0.25rem; }
        .form-field label .required { color: #D94352; }
        .form-field input, .form-field select { width: 100%; padding: 0.6rem 0.75rem; border: 1px solid #E8E2D9; border-radius: 4px; background: #faf9f7; font-size: 0.9rem; font-family: 'Inter', system-ui, sans-serif; color: #1A1A1A; transition: border 0.2s, box-shadow 0.2s; outline: none; -webkit-appearance: none; appearance: none; }
        .form-field input:focus, .form-field select:focus { border-color: #C9A84C; box-shadow: 0 0 0 3px rgba(201,168,76,0.12); }
        .form-field input::placeholder { color: #b0b0b0; font-size: 0.8rem; }
        .form-grid { display: flex; flex-direction: column; gap: 0; }
        .file-input-wrapper { position: relative; width: 100%; }
        .file-input-wrapper input[type="file"] { position: absolute; left: 0; top: 0; opacity: 0; width: 100%; height: 100%; cursor: pointer; }
        .file-input-wrapper .file-label { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; border: 1px dashed #E8E2D9; border-radius: 4px; background: #faf9f7; font-size: 0.8rem; color: #5A5A5A; cursor: pointer; transition: border 0.2s, background 0.2s; }
        .file-input-wrapper .file-label:hover { border-color: #C9A84C; background: #f5f0eb; }
        .file-input-wrapper .file-label i { color: #C9A84C; font-size: 1rem; }
        .file-input-wrapper .file-label .file-name { color: #1A1A1A; font-weight: 500; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pin-digit:focus { border-color: #C9A84C; box-shadow: 0 0 0 3px rgba(201,168,76,0.15); }
        .strength-bar { height: 4px; border-radius: 4px; background: #f0ede8; overflow: hidden; margin-top: 0.25rem; }
        .strength-bar .fill { height: 100%; width: 0%; border-radius: 4px; transition: width 0.3s ease, background 0.3s ease; }
        .upload-preview { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; background: #faf9f7; border: 1px solid #E8E2D9; border-radius: 4px; margin-top: 0.5rem; }
        .upload-preview img { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #E8E2D9; }
        .upload-preview .file-info { flex: 1; font-size: 0.8rem; color: #1A1A1A; }
        .upload-preview .file-info .size { color: #8a8a8a; font-size: 0.7rem; }
        .upload-preview .remove-btn { color: #D94352; cursor: pointer; font-size: 1rem; transition: color 0.2s; }
        .upload-preview .remove-btn:hover { color: #b02a3a; }
        .file-drop-zone.dragover { border-color: #C9A84C; background: #FDFBF7; }
        .corporate-pattern { background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C9A84C' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"); }
        .logo-svg { height: 40px; width: auto; }
        select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%235A5A5A' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.75rem center; padding-right: 2.5rem; }
        @media (max-width: 480px) { .step-indicator .step-dot span:last-child { display: none !important; } .step-indicator .step-line { width: 12px !important; } .step-indicator .step-dot .circle { width: 28px !important; height: 28px !important; font-size: 10px !important; } }
      `}</style>
    </div>
  );
};

// ===== File Upload Field Component =====
const FileUploadField = ({ label, uploadId, file, preview, onFileChange, onRemove, required }) => {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) {
      onFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="form-field">
      <label>{label} {required && <span className="required">*</span>}</label>
      <div
        className={`file-drop-zone file-input-wrapper ${dragOver ? 'dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="file-label">
          <i className="fas fa-cloud-upload-alt"></i>
          <span className="file-name">{file ? file.name : 'No file chosen'}</span>
        </div>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files[0]) {
              onFileChange(e.target.files[0]);
            }
          }}
          required={required && !file}
        />
      </div>
      <p className="text-brand-slateText text-[10px] mt-1">Accepted: JPG, PNG, PDF. Max 10 MB.</p>
      {preview && (
        <div className="upload-preview">
          <img src={preview} alt="Preview" />
          <div className="file-info">
            <span className="name">{file ? file.name : ''}</span>
            <span className="size">{file ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : ''}</span>
          </div>
          <span className="remove-btn" onClick={() => onRemove()}>&times;</span>
        </div>
      )}
    </div>
  );
};

export default EnrollPage;