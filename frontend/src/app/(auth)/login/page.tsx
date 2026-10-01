'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store/store';
import { loginUser, registerUser } from '@/store/features/authSlice';
import { Loader2, ArrowRight } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useTheme } from 'next-themes';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  const containerRef = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline>(null);

  useGSAP(() => {
    tl.current = gsap.timeline()
      .fromTo(".animate-hero-text", { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: 0.1, ease: "power4.out" })
      .fromTo(".animate-form-element", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power3.out" }, "-=0.8")
      .fromTo(".animate-image-scale", { scale: 1.1, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.5, ease: "power4.out" }, "-=1.5");
  }, { scope: containerRef });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isLogin) {
        await dispatch(loginUser({ email, password })).unwrap();
      } else {
        await dispatch(registerUser({ name, email, password })).unwrap();
      }
    } catch (err: unknown) {
      setError(err as string);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  return (
    <main ref={containerRef} className="flex min-h-screen w-full bg-background overflow-hidden relative selection:bg-foreground selection:text-background">
      {/* LEFT: EDITORIAL IMAGE & MASSIVE TYPOGRAPHY */}
      <section className="relative hidden lg:flex flex-col justify-between w-1/2 min-h-screen bg-muted/20 p-12 overflow-hidden border-r border-border">
        <div className="absolute inset-0 z-0 animate-image-scale origin-center overflow-hidden">
          <div 
            className="w-full h-full bg-cover bg-center opacity-40 mix-blend-luminosity grayscale contrast-125 dark:opacity-20"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop)' }}
          />
          <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-background/50" />
        </div>
        
        <div className="relative z-10 top-0 pt-8">
          <div className="overflow-hidden">
            <h1 className="animate-hero-text text-[clamp(3rem,5vw,5.5rem)] font-medium leading-[1.1] tracking-tight max-w-4xl">
              Secure your <br />
              digital <span className="text-muted-foreground italic">perimeter</span>
            </h1>
          </div>
          <div className="overflow-hidden mt-6">
            <p className="animate-hero-text text-xl text-muted-foreground max-w-md leading-relaxed">
              Award-winning vulnerability scanning and infrastructure health checks for modern teams.
            </p>
          </div>
        </div>

        <div className="relative z-10 overflow-hidden pb-8">
          <p className="animate-hero-text text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Cyber Scan Enterprise
          </p>
        </div>
      </section>

      {/* RIGHT: MINIMAL AUTH FORM */}
      <section className="flex flex-col justify-center items-center w-full lg:w-1/2 min-h-screen p-6 sm:p-12 md:p-24 bg-background relative">
        <div className="w-full max-w-md">
          <div className="overflow-hidden mb-12 lg:mb-16">
            <h2 className="animate-form-element text-4xl font-medium tracking-tight">
              {isLogin ? 'Welcome back.' : 'Create account.'}
            </h2>
            <p className="animate-form-element text-muted-foreground mt-2 text-lg">
              {isLogin ? 'Enter your details to proceed.' : 'Join to start scanning systems.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="animate-form-element p-4 text-sm bg-destructive/10 text-destructive border-l-2 border-destructive">
                {error}
              </div>
            )}
            
            <div className="space-y-6">
              {!isLogin && (
                <div className="animate-form-element">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full bg-muted/20 border border-border/50  px-5 py-4 text-base focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-all placeholder:text-muted-foreground/70 hover:bg-muted/40"
                    required={!isLogin}
                  />
                </div>
              )}

              <div className="animate-form-element">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full bg-muted/20 border border-border/50  px-5 py-4 text-base focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-all placeholder:text-muted-foreground/70 hover:bg-muted/40"
                  required
                />
              </div>

              <div className="animate-form-element">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-muted/20 border border-border/50  px-5 py-4 text-base focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-all placeholder:text-muted-foreground/70 hover:bg-muted/40"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="animate-form-element pt-8">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 px-8 bg-foreground text-background hover:bg-foreground/90 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden flex items-center justify-between rounded-none"
              >
                <span className="text-lg">{isLogin ? 'Sign In' : 'Create Account'}</span>
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <div className="overflow-hidden relative w-6 h-6 flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 absolute -translate-x-8 group-hover:translate-x-0 transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]" />
                    <ArrowRight className="w-5 h-5 absolute group-hover:translate-x-8 transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]" />
                  </div>
                )}
              </button>
            </div>
          </form>

          <div className="animate-form-element mt-12">
            <button 
              type="button"
              onClick={toggleMode}
              className="text-muted-foreground hover:text-foreground font-medium transition-colors text-sm group flex items-center gap-2"
            >
              {isLogin ? "Don't have an account? Create one." : "Already have an account? Sign in."}
            </button>
          </div>
        </div>
        
        {/* Theme Toggle */}
        <div className="absolute top-8 right-8 animate-form-element flex gap-4">
          <ThemeToggle />
        </div>
      </section>
    </main>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <button 
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
      aria-label="Toggle theme"
    >
      <div className="relative w-4 h-4 flex items-center justify-center overflow-hidden">
        <span className="absolute transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] dark:-translate-y-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        </span>
        <span className="absolute translate-y-8 transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] dark:translate-y-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        </span>
      </div>
    </button>
  );
}
