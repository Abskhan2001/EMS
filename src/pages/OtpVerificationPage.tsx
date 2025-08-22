/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { ArrowLeft, Mail, RefreshCw } from 'lucide-react';
import { authService } from '../services/authService';

const OtpVerificationPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get email and redirect info from navigation state
    const email = location.state?.email || '';
    
    // OTP state
    const [otp, setOtp] = useState<string[]>(['', '', '', '']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [timer, setTimer] = useState(300); // 5 minute timer (300 seconds)
    const [canResend, setCanResend] = useState(false);
    const [otpExpired, setOtpExpired] = useState(false);
    
    // Refs for OTP inputs
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    
    // Redirect if no email provided
    useEffect(() => {
        if (!email) {
            Swal.fire({
                title: 'Signup Required',
                html: `
                    <div style="text-align: center;">
                        <p style="font-size: 16px; color: #333; margin: 0;">Please complete the signup process first</p>
                        <p style="font-size: 14px; color: #666; margin: 8px 0 0 0;">Redirecting to signup page...</p>
                    </div>
                `,
                icon: 'warning',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
            }).then(() => {
                navigate('/signup');
            });
        }
    }, [email, navigate]);
    
    // Timer countdown and OTP expiration
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (timer > 0 && !canResend) {
            interval = setInterval(() => {
                setTimer((prev) => {
                    if (prev === 1) {
                        // OTP expired
                        setOtpExpired(true);
                        setCanResend(true);
                        Swal.fire({
                            title: 'OTP Expired',
                            html: `
                                <div style="text-align: center;">
                                    <p style="font-size: 16px; color: #333; margin: 0;">Your OTP has expired</p>
                                    <p style="font-size: 14px; color: #666; margin: 8px 0 0 0;">Please request a new verification code</p>
                                </div>
                            `,
                            icon: 'warning',
                            showConfirmButton: false,
                            timer: 3000,
                            timerProgressBar: true,
                        });
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (timer === 0) {
            setCanResend(true);
            setOtpExpired(true);
        }

        return () => clearInterval(interval);
    }, [timer, canResend]);
    
    // Handle OTP input change
    const handleOtpChange = useCallback((index: number, value: string) => {
        // Only allow digits
        if (!/^\d*$/.test(value)) return;
        
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        
        // Auto-focus next input
        if (value && index < 3) {
            otpRefs.current[index + 1]?.focus();
        }
    }, [otp]);
    
    // Handle backspace
    const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    }, [otp]);
    
    // Handle paste
    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
        
        if (pastedData.length === 4) {
            const newOtp = pastedData.split('');
            setOtp(newOtp);
            otpRefs.current[3]?.focus();
        }
    }, []);
    
    // Verify OTP
    const handleVerifyOtp = useCallback(async () => {
        const otpString = otp.join('');

        if (otpString.length !== 4) {
            Swal.fire({
                title: 'Incomplete OTP',
                html: `
                    <div style="text-align: center;">
                        <p style="font-size: 16px; color: #333; margin: 0;">Please enter a complete 4-digit OTP</p>
                        <p style="font-size: 14px; color: #666; margin: 8px 0 0 0;">All fields are required</p>
                    </div>
                `,
                icon: 'warning',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
            });
            return;
        }

        // Check if OTP has expired
        if (otpExpired) {
            Swal.fire({
                title: 'OTP Expired',
                html: `
                    <div style="text-align: center;">
                        <p style="font-size: 16px; color: #333; margin: 0;">Your OTP has expired</p>
                        <p style="font-size: 14px; color: #666; margin: 8px 0 0 0;">Please request a new verification code</p>
                    </div>
                `,
                icon: 'warning',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
            });
            return;
        }

        setIsSubmitting(true);
        
        try {
            const response = await authService.verifyEmailOTP(email, otpString);
            console.log('OTP verification response:', response);
            
            // Show SweetAlert2 success message
            Swal.fire({
                title: 'Email Verified Successfully!',
                text: 'Your email has been verified. You can now log in.',
                icon: 'success',
                confirmButtonText: 'Go to Login',
            }).then((result) => {
                if (result.isConfirmed) {
                    navigate('/login');
                }
            });
        } catch (error: any) {
            const errorMessage = error.message || 'An unexpected error occurred';

            if (errorMessage?.toLowerCase().includes('invalid') ||
                errorMessage?.toLowerCase().includes('incorrect')) {
                // Show SweetAlert2 error for invalid OTP
                Swal.fire({
                    title: 'Incorrect OTP',
                    html: `
                        <div style="text-align: center;">
                            <p style="font-size: 16px; color: #333; margin: 0;">The OTP you entered is incorrect</p>
                            <p style="font-size: 14px; color: #666; margin: 8px 0 0 0;">Please check and try again</p>
                        </div>
                    `,
                    icon: 'error',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true,
                });
            } else if (errorMessage?.toLowerCase().includes('expired')) {
                // Show SweetAlert2 error for expired OTP
                Swal.fire({
                    title: 'OTP Expired',
                    html: `
                        <div style="text-align: center;">
                            <p style="font-size: 16px; color: #333; margin: 0;">Your OTP has expired</p>
                            <p style="font-size: 14px; color: #666; margin: 8px 0 0 0;">Please request a new verification code</p>
                        </div>
                    `,
                    icon: 'warning',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true,
                });
                setCanResend(true);
                setTimer(0);
            } else {
                // Show SweetAlert2 error for general failure
                Swal.fire({
                    title: 'Verification Failed',
                    html: `
                        <div style="text-align: center;">
                            <p style="font-size: 16px; color: #333; margin: 0;">${errorMessage || 'OTP verification failed'}</p>
                            <p style="font-size: 14px; color: #666; margin: 8px 0 0 0;">Please try again</p>
                        </div>
                    `,
                    icon: 'error',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true,
                });
            }
            
            // Clear OTP on error
            setOtp(['', '', '', '']);
            otpRefs.current[0]?.focus();
        } finally {
            setIsSubmitting(false);
        }
    }, [otp, email, navigate, otpExpired]);
    
    // Resend OTP
    const handleResendOtp = useCallback(async () => {
        if (!canResend) return;
        
        setResendLoading(true);
        
        try {
            await authService.resendEmailOTP(email);
            
            // Show SweetAlert2 success message for resend OTP
            Swal.fire({
                title: 'Verification Code Sent Successfully!',
                html: `
                    <div style="text-align: center;">
                        <p style="font-size: 16px; color: #333; margin: 0;">New verification code sent successfully!</p>
                        <p style="font-size: 14px; color: #666; margin: 8px 0 0 0;">Please check your email: ${email}</p>
                    </div>
                `,
                icon: 'success',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
            });
            setTimer(300); // Reset to 5 minutes (300 seconds)
            setCanResend(false);
            setOtpExpired(false); // Reset expiration status
            setOtp(['', '', '', '']);
            otpRefs.current[0]?.focus();
        } catch (error: any) {
            const errorMessage = error.message || 'Failed to resend verification code';
            // Show SweetAlert2 error for resend failure
            Swal.fire({
                title: 'Failed to Send Code',
                html: `
                    <div style="text-align: center;">
                        <p style="font-size: 16px; color: #333; margin: 0;">${errorMessage}</p>
                        <p style="font-size: 14px; color: #666; margin: 8px 0 0 0;">Please try again</p>
                    </div>
                `,
                icon: 'error',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
            });
        } finally {
            setResendLoading(false);
        }
    }, [canResend, email]);
    
    // Format timer display
    const formatTimer = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    if (!email) {
        return null; // Will redirect in useEffect
    }
    
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    {/* <div className="flex items-center justify-center mb-6">
                        <Link 
                            to="/home" 
                            className="absolute left-4 p-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            <ArrowLeft size={24} />
                        </Link>
                        <div className="bg-primary/10 p-3 rounded-full">
                            <Mail className="text-primary" size={32} />
                        </div>
                    </div> */}
                    
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Verify Your Email
                    </h1>
                    
                    <p className="text-gray-600 text-sm">
                        We've sent a 4-digit verification code to
                    </p>
                    <p className="text-primary font-medium text-sm">
                        {email}
                    </p>
                </div>
                
                {/* OTP Input */}
                <div className="mb-6">
                    <div className="flex justify-center space-x-3 mb-4">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => {
                                    otpRefs.current[index] = el;
                                }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                                className={`w-14 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none transition-colors ${
                                    otpExpired
                                        ? 'border-red-300 bg-red-50 text-red-500'
                                        : 'border-gray-300 focus:border-primary'
                                }`}
                                disabled={isSubmitting || otpExpired}
                            />
                        ))}
                    </div>
                    
                    {otpExpired && (
                        <p className="text-red-500 text-sm text-center mb-4">
                            ⚠️ OTP has expired. Please request a new verification code.
                        </p>
                    )}
                </div>
                
                {/* Verify Button */}
                <button
                    onClick={handleVerifyOtp}
                    disabled={isSubmitting || otp.join('').length !== 4 || otpExpired}
                    className={`w-full py-3 rounded-xl font-medium transition-colors mb-6 ${
                        otpExpired
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-primary text-white hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer'
                    }`}
                >
                    {otpExpired ? 'OTP Expired' : (isSubmitting ? 'Verifying...' : 'Verify Email')}
                </button>
                
                {/* Resend Section */}
                <div className="text-center">
                    <p className="text-gray-600 text-sm mb-2">
                        Didn't receive the code?
                    </p>
                    
                    {canResend ? (
                        <button
                            onClick={handleResendOtp}
                            disabled={resendLoading}
                            className="text-primary font-medium text-sm hover:underline disabled:opacity-50 flex items-center justify-center space-x-1"
                        >
                            {resendLoading && <RefreshCw size={16} className="animate-spin" />}
                            <span>{resendLoading ? 'Sending...' : 'Resend Code'}</span>
                        </button>
                    ) : (
                        <p className={`text-sm ${timer <= 10 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                            {timer <= 10 ? '⏰ ' : ''}Resend code in {formatTimer(timer)}
                            {timer <= 10 ? ' (expiring soon!)' : ''}
                        </p>
                    )}
                </div>
                
                {/* Back to Signup */}
                <div className="text-center mt-6">
                    <Link 
                        to="/home" 
                        className="text-gray-600 text-sm hover:text-gray-800 transition-colors"
                    >
                        Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default OtpVerificationPage;
