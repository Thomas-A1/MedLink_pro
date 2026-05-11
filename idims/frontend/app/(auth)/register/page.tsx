'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { AddressAutocomplete } from '@/components/address-autocomplete';

// Phone number normalization function
function normalizePhoneNumber(phone: string): string {
  if (!phone) return phone;
  
  // Remove all spaces, dashes, and other non-digit characters except +
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // If it already starts with +233, return as is
  if (cleaned.startsWith('+233')) {
    const digits = cleaned.substring(4);
    if (/^\d{9}$/.test(digits)) {
      return `+233${digits}`;
    }
    return cleaned; // Return as is if invalid, let validation catch it
  }
  
  // If it starts with 233 (without +), add the +
  if (cleaned.startsWith('233')) {
    const digits = cleaned.substring(3);
    if (/^\d{9}$/.test(digits)) {
      return `+233${digits}`;
    }
    return cleaned;
  }
  
  // If it starts with 0 (local format), replace with +233
  if (cleaned.startsWith('0')) {
    const digits = cleaned.substring(1);
    if (/^\d{9}$/.test(digits)) {
      return `+233${digits}`;
    }
    return cleaned;
  }
  
  // If it's just 9 digits, assume it's missing the prefix
  if (/^\d{9}$/.test(cleaned)) {
    return `+233${cleaned}`;
  }
  
  return cleaned; // Return as is, let validation catch invalid formats
}

const registerSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone_number: z.string()
    .min(9, 'Phone number must be at least 9 digits')
    .refine((val) => {
      const normalized = normalizePhoneNumber(val);
      return /^\+233\d{9}$/.test(normalized);
    }, {
      message: 'Phone number must be in format +233XXXXXXXXX, 0XXXXXXXXX, or 233XXXXXXXXX',
    })
    .transform((val) => normalizePhoneNumber(val)), // Normalize before sending to backend
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string().min(8, 'Password must be at least 8 characters'),
  pharmacy_name: z.string().min(2, 'Pharmacy name is required'),
  pharmacy_license_number: z.string().min(2, 'License number is required'),
  address: z.string().min(5, 'Address is required'),
  region: z.string().min(2, 'Region is required'),
  district: z.string().min(2, 'District is required'),
  superintendent_pharmacist_name: z.string().min(2, 'Superintendent name is required'),
  superintendent_pharmacist_license: z.string().min(2, 'Superintendent license is required'),
  superintendent_pharmacist_id_number: z.string().min(5, 'ID number is required'),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
    setValue,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });

  // Watch password fields for real-time validation
  const password = watch('password');
  const confirmPassword = watch('confirm_password');

  // Trigger validation when either password field changes
  useEffect(() => {
    if (password || confirmPassword) {
      trigger('confirm_password');
    }
  }, [password, confirmPassword, trigger]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdCardFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdCardPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      const step1Fields: (keyof RegisterForm)[] = ['first_name', 'last_name', 'email', 'phone_number', 'password'];
      const isValid = await trigger(step1Fields);
      if (isValid) {
        setStep(2);
      }
    } else if (step === 2) {
      const step2Fields: (keyof RegisterForm)[] = ['pharmacy_name', 'pharmacy_license_number', 'address', 'region', 'district'];
      const isValid = await trigger(step2Fields);
      if (isValid) {
        setStep(3);
      }
    }
  };

  const onSubmit = async (data: RegisterForm) => {
    // Only submit on final step
    if (step < 3) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      
      // Exclude confirm_password from submission
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'confirm_password') {
          formData.append(key, value);
        }
      });

      if (idCardFile) {
        formData.append('id_card', idCardFile);
      }

      const response = await apiClient.post('/auth/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { user } = response.data;
      setAuth(user);

      alert('Registration successful! Your account is pending verification.');
      
      if (user.role === 'superadmin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Account Info', icon: '👤' },
    { number: 2, title: 'Pharmacy Details', icon: '🏥', shortTitle: 'Pharmacy' },
    { number: 3, title: 'Verification', icon: '✅' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-4 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute top-40 right-10 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-6 left-6 z-20"
      >
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg hover:bg-white transition-colors shadow-lg"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-gray-700 font-medium">Back to Home</span>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-4xl"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border border-white/20 max-h-[90vh] flex flex-col w-full mx-4 sm:mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl opacity-50" />
          
          <div className="relative flex flex-col flex-1 min-h-0">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center mb-4 flex-shrink-0"
            >
              <div className="flex justify-center mb-3">
                <Image
                  src="/idims-logo.svg"
                  alt="MedLink Logo"
                  width={100}
                  height={100}
                  className="mx-auto"
                />
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Register Your Pharmacy
              </h1>
              <p className="text-sm sm:text-base text-gray-600 font-medium">
                Join MedLink and streamline your inventory management
              </p>
            </motion.div>

            {/* Progress Steps - Centered and Full Width */}
            <div className="mb-4 flex-shrink-0 px-4">
              <div className="flex items-center justify-center w-full">
                {steps.map((s, index) => (
                  <div key={s.number} className="flex items-center">
                    {/* Step Circle */}
                    <div className="flex flex-col items-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative"
                      >
                        <motion.div
                          className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center font-semibold transition-all ${
                            step >= s.number
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                          whileHover={{ scale: 1.1 }}
                        >
                          <span className="text-lg sm:text-xl md:text-2xl leading-none">{step > s.number ? '✓' : s.icon}</span>
                        </motion.div>
                        {step === s.number && (
                          <motion.div
                            className="absolute inset-0 rounded-full bg-blue-400"
                            initial={{ scale: 1 }}
                            animate={{ scale: 1.5, opacity: 0 }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        )}
                      </motion.div>
                      <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 + 0.2 }}
                        className={`mt-2 text-xs sm:text-sm font-medium hidden sm:block whitespace-nowrap ${
                          step >= s.number ? 'text-blue-600' : 'text-gray-600'
                        }`}
                      >
                        {s.title}
                      </motion.span>
                    </div>
                    {/* Connecting Line */}
                    {index < steps.length - 1 && (
                      <div className="h-1 w-12 sm:w-20 md:w-32 lg:w-40 xl:w-48 relative overflow-hidden mx-1 sm:mx-2 md:mx-3 lg:mx-4 flex-shrink-0">
                        <div className="absolute inset-0 bg-gray-200 rounded-full" />
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                          initial={{ width: step > s.number ? '100%' : '0%' }}
                          animate={{ width: step > s.number ? '100%' : '0%' }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 space-y-3 sm:space-y-4 md:space-y-6 overflow-y-auto">
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 sm:space-y-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-700 text-sm"
                >
                  {error}
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                      <span className="text-xl sm:text-2xl md:text-3xl flex-shrink-0">👤</span>
                      <span className="break-words">Account Information</span>
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { name: 'first_name', label: 'First Name', type: 'text' },
                        { name: 'last_name', label: 'Last Name', type: 'text' },
                      ].map((field) => (
                        <div key={field.name}>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {field.label} *
                          </label>
                          <input
                            {...register(field.name as keyof RegisterForm)}
                            type={field.type}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50 backdrop-blur-sm"
                          />
                          {errors[field.name as keyof RegisterForm] && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors[field.name as keyof RegisterForm]?.message}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <input
                          {...register('email')}
                          type="email"
                          placeholder="your.email@pharmacy.com"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50 backdrop-blur-sm"
                        />
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Phone Number *
                        </label>
                        <input
                          {...register('phone_number')}
                          type="tel"
                          placeholder="0548200410 or +233548200410"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50 backdrop-blur-sm"
                        />
                        {errors.phone_number && (
                          <p className="mt-1 text-sm text-red-600">{errors.phone_number.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Password *
                        </label>
                        <input
                          {...register('password')}
                          type="password"
                          placeholder="Minimum 8 characters"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50 backdrop-blur-sm"
                        />
                        {errors.password && (
                          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Confirm Password *
                        </label>
                        <input
                          {...register('confirm_password')}
                          type="password"
                          placeholder="Confirm your password"
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all bg-white/50 backdrop-blur-sm ${
                            confirmPassword && password !== confirmPassword
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                              : confirmPassword && password === confirmPassword
                              ? 'border-green-500 focus:border-green-500'
                              : 'border-gray-200 focus:border-blue-500'
                          }`}
                        />
                        {errors.confirm_password && (
                          <p className="mt-1 text-sm text-red-600">{errors.confirm_password.message}</p>
                        )}
                        {confirmPassword && password === confirmPassword && !errors.confirm_password && (
                          <p className="mt-1 text-sm text-green-600">Passwords match</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                      <span className="text-xl sm:text-2xl md:text-3xl flex-shrink-0">🏥</span>
                      <span className="break-words">Pharmacy Details</span>
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Pharmacy Name *
                        </label>
                        <input
                          {...register('pharmacy_name')}
                          type="text"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50 backdrop-blur-sm"
                        />
                        {errors.pharmacy_name && (
                          <p className="mt-1 text-sm text-red-600">{errors.pharmacy_name.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          License Number *
                        </label>
                        <input
                          {...register('pharmacy_license_number')}
                          type="text"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50 backdrop-blur-sm"
                        />
                        {errors.pharmacy_license_number && (
                          <p className="mt-1 text-sm text-red-600">{errors.pharmacy_license_number.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Address *
                      </label>
                      <AddressAutocomplete
                        value={watch('address') || ''}
                        onChange={(value) => {
                          setValue('address', value);
                        }}
                        onSelect={(suggestion) => {
                          setValue('address', suggestion.display_name);
                          // Auto-fill region and district if available
                          if (suggestion.address.state) {
                            setValue('region', suggestion.address.state);
                          }
                          if (suggestion.address.city) {
                            setValue('district', suggestion.address.city);
                          }
                        }}
                        placeholder="Start typing your pharmacy address..."
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50 backdrop-blur-sm"
                        error={errors.address?.message}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { name: 'region', label: 'Region' },
                        { name: 'district', label: 'District' },
                      ].map((field) => (
                        <div key={field.name}>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {field.label} *
                          </label>
                          <input
                            {...register(field.name as keyof RegisterForm)}
                            type="text"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50 backdrop-blur-sm"
                          />
                          {errors[field.name as keyof RegisterForm] && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors[field.name as keyof RegisterForm]?.message}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                      <span className="text-xl sm:text-2xl md:text-3xl flex-shrink-0">✅</span>
                      <span className="break-words text-base sm:text-xl">Superintendent Pharmacist & Verification</span>
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Superintendent Name *
                        </label>
                        <input
                          {...register('superintendent_pharmacist_name')}
                          type="text"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50 backdrop-blur-sm"
                        />
                        {errors.superintendent_pharmacist_name && (
                          <p className="mt-1 text-sm text-red-600">{errors.superintendent_pharmacist_name.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Superintendent License *
                        </label>
                        <input
                          {...register('superintendent_pharmacist_license')}
                          type="text"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50 backdrop-blur-sm"
                        />
                        {errors.superintendent_pharmacist_license && (
                          <p className="mt-1 text-sm text-red-600">{errors.superintendent_pharmacist_license.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Ghana ID Number *
                      </label>
                      <input
                        {...register('superintendent_pharmacist_id_number')}
                        type="text"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50 backdrop-blur-sm"
                      />
                      {errors.superintendent_pharmacist_id_number && (
                        <p className="mt-1 text-sm text-red-600">{errors.superintendent_pharmacist_id_number.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Ghana ID Card (Image) *
                      </label>
                      <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-blue-500 transition-colors">
                        <div className="space-y-1 text-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <div className="flex text-sm text-gray-600">
                            <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500">
                              <span>Upload a file</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="sr-only"
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                        </div>
                      </div>
                      {idCardPreview && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="mt-4"
                        >
                          <img
                            src={idCardPreview}
                            alt="ID Card Preview"
                            className="max-w-md h-auto border-2 border-gray-300 rounded-xl shadow-lg mx-auto"
                          />
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>

              <div className="flex justify-between pt-4 flex-shrink-0">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                  >
                    Previous
                  </button>
                )}
                <div className="flex-1" />
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-2xl hover:shadow-blue-500/50 transition-all relative overflow-hidden group"
                  >
                    <span className="relative z-10">Next</span>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading || !idCardFile}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-2xl hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                  >
                    <span className="relative z-10">
                      {loading ? 'Processing...' : 'Complete Registration'}
                    </span>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  </button>
                )}
              </div>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600 flex-shrink-0">
              <p>
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Login here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
