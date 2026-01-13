import React, { useState } from 'react';
import { Gift, Users, Zap } from 'lucide-react';

export default function MarketingLandingPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    alert('Thank you for signing up!');
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.name]: e.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-6">
        <div className="flex items-center gap-2 text-white">
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 bg-white/20 rounded"></div>
            <span className="font-semibold">LAND</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="max-w-7xl w-full mx-auto">
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
            <div className="grid md:grid-cols-2">
              {/* Left Side - Hero Image */}
              <div className="relative h-96 md:h-auto bg-gray-200">
                <img 
                  src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80" 
                  alt="Modern office space"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent">
                  <div className="p-8 md:p-12 h-full flex flex-col justify-center">
                    <h1 className="text-white text-4xl md:text-5xl font-bold mb-4 leading-tight">
                      Creating Your<br />Marketing Landing
                    </h1>
                    <p className="text-white/90 text-sm md:text-base max-w-md">
                      This should be used to tell a story and benefits or more to present project. This should be used to tell a story and let your users know.
                    </p>
                    <button className="mt-6 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                      <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-blue-600 border-b-8 border-b-transparent ml-1"></div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Side - Form */}
              <div className="p-8 md:p-12 bg-white flex items-center">
                <div className="w-full">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                    Get Free Updates
                  </h2>
                  <p className="text-gray-500 text-sm mb-6">
                    Supporting call-to-action goes here
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <input
                        type="text"
                        name="fullName"
                        placeholder="Full Name"
                        value={formData.fullName}
                        onChange={(e) => handleChange(e.target)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={(e) => handleChange(e.target)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Phone"
                        value={formData.phone}
                        onChange={(e) => handleChange(e.target)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-sm uppercase tracking-wide"
                    >
                      SIGN ME NOW
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Start Your Campaign</h3>
              <p className="text-gray-600 text-sm">
                Very impressive you with fully customizable and highly performance
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Engage New Users</h3>
              <p className="text-gray-600 text-sm">
                Very impressive you with fully customizable and highly performance
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Claim Your Reward</h3>
              <p className="text-gray-600 text-sm">
                Very impressive you with fully customizable and highly performance
              </p>
            </div>
          </div>

          {/* Our Features Section */}
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-16">
            Our Features Suits All Types
          </h2>

          {/* Feature 1 */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <img 
                src="https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&q=80"
                alt="Person using phone"
                className="rounded-lg shadow-lg w-full"
              />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Works On All Platforms
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Easy & Secure Access
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.
              </p>
            </div>
            <div className="order-1 md:order-2">
              <img 
                src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&q=80"
                alt="Leather bag and accessories"
                className="rounded-lg shadow-lg w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}