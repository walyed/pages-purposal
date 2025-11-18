import { useState, useRef, useEffect } from 'react';
import './PaymentForm.css';

interface PaymentFormProps {
  variant?: 1 | 2 | 3;
}

const PaymentForm = ({ variant = 1 }: PaymentFormProps) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '', // Add email field
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    bankName: '',
    accountFirstName: '',
    accountLastName: '',
    accountNumber: '',
    routingNumber: '',
    accountType: 'Checking',
    authorization: false,
    signatureData: '',
    signatureDate: new Date().toISOString().split('T')[0],
  });

  const [signatureMode, setSignatureMode] = useState<'type' | 'draw'>('type');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (signatureMode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx && !formData.signatureData) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [signatureMode, formData.signatureData]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      const canvas = canvasRef.current;
      const signatureDataUrl = canvas.toDataURL();
      setFormData((prev) => ({ ...prev, signatureData: signatureDataUrl }));
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    setFormData((prev) => ({ ...prev, signatureData: '' }));
    if (signatureMode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate authorization checkbox
    if (!formData.authorization) {
      alert('Please authorize the payment by checking the checkbox.');
      return;
    }

    // Validate required bank account fields
    if (!formData.accountNumber || !formData.routingNumber) {
      alert('Please enter bank account details.');
      return;
    }

    // Get payment amount from user
    const amount = prompt('Enter payment amount in USD (e.g., 100 for $100):');
    if (!amount || isNaN(Number(amount))) {
      alert('Invalid amount entered.');
      return;
    }

    setIsProcessing(true);

    try {
      // Call backend API to process bank payment
      const response = await fetch('/api/create-bank-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData,
          amount: Number(amount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      // Success!
      alert(`Payment successful! Charge ID: ${data.chargeId}`);
      console.log('Payment details:', data);
      
      // Reset form
      window.location.reload();

    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Payment failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Background images mapping
  const backgroundImages: Record<number, string> = {
    1: '/6f3a8889-5145-4463-be39-561234b4be77.jpg',
    2: '/789748b4-d8ee-4dba-90d2-1439665bee7c.jpg',
    3: '/background-3.jpeg',
  };

  return (
    <div
      className="payment-page"
      style={{ backgroundImage: `url(${backgroundImages[variant]})` }}
    >
      <div className="form-container">
        <form onSubmit={handleSubmit} className="payment-form">
          <h1 className="form-title">Bank Account Authorization Form</h1>

          {/* Name Section */}
          <div className="form-section">
            <label className="field-label">
              Name <span className="required">*</span>
            </label>
            <div className="name-row">
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="First"
                className="form-input half-width"
                required
              />
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Last"
                className="form-input half-width"
                required
              />
            </div>
          </div>

          {/* Company Name */}
          <div className="form-section">
            <label className="field-label">
              Company Name <span className="required">*</span>
            </label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              className="form-input"
              required
            />
          </div>

          {/* Email */}
          <div className="form-section">
            <label className="field-label">
              Email Address <span className="required">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="form-input"
              placeholder="your@email.com"
              required
            />
          </div>

          {/* Billing Address */}
          <div className="form-section">
            <label className="field-label">
              Billing Address <span className="required">*</span>
            </label>
            <input
              type="text"
              name="addressLine1"
              value={formData.addressLine1}
              onChange={handleInputChange}
              placeholder="Address Line 1"
              className="form-input"
              required
            />
            <input
              type="text"
              name="addressLine2"
              value={formData.addressLine2}
              onChange={handleInputChange}
              placeholder="Address Line 2"
              className="form-input"
            />
            <div className="address-row">
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="City"
                className="form-input address-field"
                required
              />
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                placeholder="State / Province / Region"
                className="form-input address-field"
                required
              />
              <input
                type="text"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleInputChange}
                placeholder="Postal / Zip Code"
                className="form-input address-field"
                required
              />
              <select
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="form-input address-field"
                required
              >
                <option value="United States">United States</option>
                <option value="Canada">Canada</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Australia">Australia</option>
                <option value="Afghanistan">Afghanistan</option>
                <option value="Albania">Albania</option>
                <option value="Algeria">Algeria</option>
                <option value="Andorra">Andorra</option>
                <option value="Angola">Angola</option>
                <option value="Argentina">Argentina</option>
                <option value="Armenia">Armenia</option>
                <option value="Austria">Austria</option>
                <option value="Azerbaijan">Azerbaijan</option>
                <option value="Bahamas">Bahamas</option>
                <option value="Bahrain">Bahrain</option>
                <option value="Bangladesh">Bangladesh</option>
                <option value="Barbados">Barbados</option>
                <option value="Belarus">Belarus</option>
                <option value="Belgium">Belgium</option>
                <option value="Belize">Belize</option>
                <option value="Benin">Benin</option>
                <option value="Bhutan">Bhutan</option>
                <option value="Bolivia">Bolivia</option>
                <option value="Bosnia and Herzegovina">Bosnia and Herzegovina</option>
                <option value="Botswana">Botswana</option>
                <option value="Brazil">Brazil</option>
                <option value="Brunei">Brunei</option>
                <option value="Bulgaria">Bulgaria</option>
                <option value="Burkina Faso">Burkina Faso</option>
                <option value="Burundi">Burundi</option>
                <option value="Cambodia">Cambodia</option>
                <option value="Cameroon">Cameroon</option>
                <option value="Cape Verde">Cape Verde</option>
                <option value="Central African Republic">Central African Republic</option>
                <option value="Chad">Chad</option>
                <option value="Chile">Chile</option>
                <option value="China">China</option>
                <option value="Colombia">Colombia</option>
                <option value="Comoros">Comoros</option>
                <option value="Congo">Congo</option>
                <option value="Costa Rica">Costa Rica</option>
                <option value="Croatia">Croatia</option>
                <option value="Cuba">Cuba</option>
                <option value="Cyprus">Cyprus</option>
                <option value="Czech Republic">Czech Republic</option>
                <option value="Denmark">Denmark</option>
                <option value="Djibouti">Djibouti</option>
                <option value="Dominica">Dominica</option>
                <option value="Dominican Republic">Dominican Republic</option>
                <option value="Ecuador">Ecuador</option>
                <option value="Egypt">Egypt</option>
                <option value="El Salvador">El Salvador</option>
                <option value="Equatorial Guinea">Equatorial Guinea</option>
                <option value="Eritrea">Eritrea</option>
                <option value="Estonia">Estonia</option>
                <option value="Ethiopia">Ethiopia</option>
                <option value="Fiji">Fiji</option>
                <option value="Finland">Finland</option>
                <option value="France">France</option>
                <option value="Gabon">Gabon</option>
                <option value="Gambia">Gambia</option>
                <option value="Georgia">Georgia</option>
                <option value="Germany">Germany</option>
                <option value="Ghana">Ghana</option>
                <option value="Greece">Greece</option>
                <option value="Grenada">Grenada</option>
                <option value="Guatemala">Guatemala</option>
                <option value="Guinea">Guinea</option>
                <option value="Guinea-Bissau">Guinea-Bissau</option>
                <option value="Guyana">Guyana</option>
                <option value="Haiti">Haiti</option>
                <option value="Honduras">Honduras</option>
                <option value="Hungary">Hungary</option>
                <option value="Iceland">Iceland</option>
                <option value="India">India</option>
                <option value="Indonesia">Indonesia</option>
                <option value="Iran">Iran</option>
                <option value="Iraq">Iraq</option>
                <option value="Ireland">Ireland</option>
                <option value="Israel">Israel</option>
                <option value="Italy">Italy</option>
                <option value="Jamaica">Jamaica</option>
                <option value="Japan">Japan</option>
                <option value="Jordan">Jordan</option>
                <option value="Kazakhstan">Kazakhstan</option>
                <option value="Kenya">Kenya</option>
                <option value="Kiribati">Kiribati</option>
                <option value="Kuwait">Kuwait</option>
                <option value="Kyrgyzstan">Kyrgyzstan</option>
                <option value="Laos">Laos</option>
                <option value="Latvia">Latvia</option>
                <option value="Lebanon">Lebanon</option>
                <option value="Lesotho">Lesotho</option>
                <option value="Liberia">Liberia</option>
                <option value="Libya">Libya</option>
                <option value="Liechtenstein">Liechtenstein</option>
                <option value="Lithuania">Lithuania</option>
                <option value="Luxembourg">Luxembourg</option>
                <option value="Madagascar">Madagascar</option>
                <option value="Malawi">Malawi</option>
                <option value="Malaysia">Malaysia</option>
                <option value="Maldives">Maldives</option>
                <option value="Mali">Mali</option>
                <option value="Malta">Malta</option>
                <option value="Marshall Islands">Marshall Islands</option>
                <option value="Mauritania">Mauritania</option>
                <option value="Mauritius">Mauritius</option>
                <option value="Mexico">Mexico</option>
                <option value="Micronesia">Micronesia</option>
                <option value="Moldova">Moldova</option>
                <option value="Monaco">Monaco</option>
                <option value="Mongolia">Mongolia</option>
                <option value="Montenegro">Montenegro</option>
                <option value="Morocco">Morocco</option>
                <option value="Mozambique">Mozambique</option>
                <option value="Myanmar">Myanmar</option>
                <option value="Namibia">Namibia</option>
                <option value="Nauru">Nauru</option>
                <option value="Nepal">Nepal</option>
                <option value="Netherlands">Netherlands</option>
                <option value="New Zealand">New Zealand</option>
                <option value="Nicaragua">Nicaragua</option>
                <option value="Niger">Niger</option>
                <option value="Nigeria">Nigeria</option>
                <option value="North Korea">North Korea</option>
                <option value="North Macedonia">North Macedonia</option>
                <option value="Norway">Norway</option>
                <option value="Oman">Oman</option>
                <option value="Pakistan">Pakistan</option>
                <option value="Palau">Palau</option>
                <option value="Palestine">Palestine</option>
                <option value="Panama">Panama</option>
                <option value="Papua New Guinea">Papua New Guinea</option>
                <option value="Paraguay">Paraguay</option>
                <option value="Peru">Peru</option>
                <option value="Philippines">Philippines</option>
                <option value="Poland">Poland</option>
                <option value="Portugal">Portugal</option>
                <option value="Qatar">Qatar</option>
                <option value="Romania">Romania</option>
                <option value="Russia">Russia</option>
                <option value="Rwanda">Rwanda</option>
                <option value="Saint Kitts and Nevis">Saint Kitts and Nevis</option>
                <option value="Saint Lucia">Saint Lucia</option>
                <option value="Saint Vincent and the Grenadines">Saint Vincent and the Grenadines</option>
                <option value="Samoa">Samoa</option>
                <option value="San Marino">San Marino</option>
                <option value="Saudi Arabia">Saudi Arabia</option>
                <option value="Senegal">Senegal</option>
                <option value="Serbia">Serbia</option>
                <option value="Seychelles">Seychelles</option>
                <option value="Sierra Leone">Sierra Leone</option>
                <option value="Singapore">Singapore</option>
                <option value="Slovakia">Slovakia</option>
                <option value="Slovenia">Slovenia</option>
                <option value="Solomon Islands">Solomon Islands</option>
                <option value="Somalia">Somalia</option>
                <option value="South Africa">South Africa</option>
                <option value="South Korea">South Korea</option>
                <option value="South Sudan">South Sudan</option>
                <option value="Spain">Spain</option>
                <option value="Sri Lanka">Sri Lanka</option>
                <option value="Sudan">Sudan</option>
                <option value="Suriname">Suriname</option>
                <option value="Sweden">Sweden</option>
                <option value="Switzerland">Switzerland</option>
                <option value="Syria">Syria</option>
                <option value="Taiwan">Taiwan</option>
                <option value="Tajikistan">Tajikistan</option>
                <option value="Tanzania">Tanzania</option>
                <option value="Thailand">Thailand</option>
                <option value="Timor-Leste">Timor-Leste</option>
                <option value="Togo">Togo</option>
                <option value="Tonga">Tonga</option>
                <option value="Trinidad and Tobago">Trinidad and Tobago</option>
                <option value="Tunisia">Tunisia</option>
                <option value="Turkey">Turkey</option>
                <option value="Turkmenistan">Turkmenistan</option>
                <option value="Tuvalu">Tuvalu</option>
                <option value="Uganda">Uganda</option>
                <option value="Ukraine">Ukraine</option>
                <option value="United Arab Emirates">United Arab Emirates</option>
                <option value="Uruguay">Uruguay</option>
                <option value="Uzbekistan">Uzbekistan</option>
                <option value="Vanuatu">Vanuatu</option>
                <option value="Vatican City">Vatican City</option>
                <option value="Venezuela">Venezuela</option>
                <option value="Vietnam">Vietnam</option>
                <option value="Yemen">Yemen</option>
                <option value="Zambia">Zambia</option>
                <option value="Zimbabwe">Zimbabwe</option>
              </select>
            </div>
          </div>

          {/* Bank Information Row */}
          <div className="bank-info-row">
            {/* Bank Name */}
            <div className="form-section half-section">
              <label className="field-label">
                Bank Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>

            {/* Name on Account */}
            <div className="form-section half-section">
              <label className="field-label">Name on Account</label>
              <div className="name-row">
                <input
                  type="text"
                  name="accountFirstName"
                  value={formData.accountFirstName}
                  onChange={handleInputChange}
                  placeholder="First"
                  className="form-input"
                />
                <input
                  type="text"
                  name="accountLastName"
                  value={formData.accountLastName}
                  onChange={handleInputChange}
                  placeholder="Last"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Account Details Row */}
          <div className="bank-info-row">
            {/* Account Number */}
            <div className="form-section half-section">
              <label className="field-label">
                Account Number <span className="required">*</span>
              </label>
              <input
                type="text"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>

            {/* Routing Number */}
            <div className="form-section half-section">
              <label className="field-label">
                Routing Number <span className="required">*</span>
              </label>
              <input
                type="text"
                name="routingNumber"
                value={formData.routingNumber}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>
          </div>

          {/* Account Type */}
          <div className="form-section">
            <label className="field-label">
              Account Type <span className="required">*</span>
            </label>
            <select
              name="accountType"
              value={formData.accountType}
              onChange={handleInputChange}
              className="form-input"
              required
            >
              <option value="Checking">Checking</option>
              <option value="Savings">Savings</option>
            </select>
          </div>

          {/* Authorization Checkbox */}
          <div className="form-section authorization-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="authorization"
                checked={formData.authorization}
                onChange={handleInputChange}
                required
              />
              <span className="checkbox-text">
                I authorize Thrive Internet Marketing Agency to store my payment
                information and to make automatic payments in advance of work as
                outlined in the Terms & Conditions in my proposal.
              </span>
              <div className="radio-group">
                <label className="radio-label">
                  <input type="radio" name="consent" value="yes" required />
                  Yes
                </label>
                <label className="radio-label">
                  <input type="radio" name="consent" value="no" />
                  No
                </label>
              </div>
            </label>
          </div>

          {/* Signature Section */}
          <div className="signature-row">
            <div className="form-section signature-section">
              <label className="field-label">
                Signature <span className="required">*</span>
              </label>
              <div className="signature-pad">
                {signatureMode === 'type' ? (
                  <textarea
                    name="signatureData"
                    value={formData.signatureData}
                    onChange={handleInputChange}
                    className="signature-textarea"
                    placeholder="Type your signature here..."
                    required
                  />
                ) : (
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={150}
                    className="signature-canvas"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                )}
                <div className="signature-actions">
                  <button
                    type="button"
                    className="signature-button"
                    onClick={clearSignature}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className={`signature-button ${signatureMode === 'draw' ? 'active' : ''}`}
                    onClick={() => setSignatureMode('draw')}
                  >
                    Draw
                  </button>
                  <button
                    type="button"
                    className={`signature-button ${signatureMode === 'type' ? 'active' : ''}`}
                    onClick={() => setSignatureMode('type')}
                  >
                    Type
                  </button>
                </div>
              </div>
            </div>

            <div className="form-section date-section">
              <label className="field-label">
                Date of Signature <span className="required">*</span>
              </label>
              <input
                type="date"
                name="signatureDate"
                value={formData.signatureDate}
                onChange={handleInputChange}
                className="form-input date-input"
                required
              />
            </div>
          </div>

          {/* Disclaimer */}
          <p className="disclaimer">
            *This form is used to submit payment information only. We will call your
            bank account at a later time.
          </p>

          {/* Submit Button */}
          <button type="submit" className="submit-button" disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Submit Payment'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PaymentForm;
