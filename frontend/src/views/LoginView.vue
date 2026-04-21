<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { LayoutDashboardIcon, EyeIcon, EyeOffIcon, CheckIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ENV } from '@/config/env'
import { useAuthStore } from '@/stores/auth.store'
import loginBg from '@/assets/images/login-bg-v2.png'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const rememberMe = ref(true)

onMounted(() => {
  if (authStore.isAuthenticated) {
    void router.replace({ name: 'AllComments' })
  }
})

function loginWithFacebook(): void {
  window.location.href = `${ENV.API_URL}/auth/facebook`
}

function handleLogin(): void {
  // Manual login mockup
  console.log('Login with:', email.value, password.value)
}
</script>

<template>
  <div class="flex min-h-screen bg-white font-sans selection:bg-slate-900 selection:text-white">
    <!-- Left Section: Visuals & Branding -->
    <div class="relative hidden w-1/2 overflow-hidden lg:block">
      <img :src="loginBg" alt="Login Background" class="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 hover:scale-105" />
      <div class="absolute inset-0 bg-black/20"></div>
      
      <!-- Top Left Logo -->
      <div class="absolute left-10 top-10 flex items-center gap-3 text-white">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-xl border border-white/30">
          <LayoutDashboardIcon class="h-5 w-5" />
        </div>
        <span class="text-xl font-semibold tracking-tight">FB Comment Manager</span>
      </div>

      <!-- Bottom Content Overlay -->
      <div class="absolute bottom-20 left-12 max-w-lg text-white">
        <h1 class="mb-4 text-5xl font-bold leading-tight tracking-tight">Find your social success</h1>
        <p class="mb-8 text-lg font-light opacity-80 leading-relaxed">
          Manage your Facebook interactions with ease. Schedule, track, and reply to comments in just a few clicks.
        </p>
        
        <!-- Carousel Indicators -->
        <div class="flex items-center gap-2">
          <div class="h-1.5 w-8 rounded-full bg-white"></div>
          <div class="h-1.5 w-2 rounded-full bg-white/40"></div>
          <div class="h-1.5 w-2 rounded-full bg-white/40"></div>
        </div>
      </div>
    </div>

    <!-- Right Section: Login Form -->
    <div class="relative flex w-full flex-col items-center justify-center p-8 lg:w-1/2">
      <!-- Top Right Sign In Button -->
      <div class="absolute right-10 top-10">
        <Button class="rounded-full bg-black px-8 py-5 text-sm font-medium text-white hover:bg-slate-800 transition-all">
          Sign in
        </Button>
      </div>

      <div class="w-full max-w-md space-y-10">
        <!-- Header -->
        <div class="space-y-2">
          <h2 class="text-[32px] font-bold tracking-tight text-slate-900">Welcome Back to FB Manager!</h2>
          <p class="text-slate-400 text-sm">Sign in your account</p>
        </div>

        <!-- Form Fields -->
        <div class="space-y-6">
          <!-- Email Field -->
          <div class="space-y-2.5">
            <Label for="email" class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="info.madhu786@gmail.com" 
              v-model="email"
              class="h-12 border-slate-200 bg-white px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-black placeholder:text-slate-300"
            />
          </div>

          <!-- Password Field -->
          <div class="space-y-2.5">
            <Label for="password" class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</Label>
            <div class="relative">
              <Input 
                id="password" 
                :type="showPassword ? 'text' : 'password'" 
                placeholder="********" 
                v-model="password"
                class="h-12 border-slate-200 bg-white pl-4 pr-12 text-slate-900 focus-visible:ring-1 focus-visible:ring-black placeholder:text-slate-300"
              />
              <button 
                type="button" 
                class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                @click="showPassword = !showPassword"
              >
                <EyeIcon class="h-5 w-5" />
              </button>
            </div>
          </div>

          <!-- Options -->
          <div class="flex items-center justify-between pt-1">
            <div class="flex items-center gap-2 cursor-pointer" @click="rememberMe = !rememberMe">
              <div 
                class="flex h-4 w-4 items-center justify-center rounded border transition-colors"
                :class="rememberMe ? 'bg-black border-black' : 'border-slate-300'"
              >
                <CheckIcon v-if="rememberMe" class="h-3 w-3 text-white" />
              </div>
              <span class="text-xs font-medium text-slate-600">Remember Me</span>
            </div>
            <a href="#" class="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors">Forgot Password?</a>
          </div>

          <!-- Login Button -->
          <Button 
            class="h-12 w-full bg-[#1A1D1F] text-sm font-semibold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            @click="handleLogin"
          >
            Login
          </Button>
        </div>

        <!-- Social login section -->
        <div class="space-y-8">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <Separator class="bg-slate-100" />
            </div>
            <div class="relative flex justify-center text-[10px] font-bold uppercase tracking-[2px]">
              <span class="bg-white px-4 text-slate-400">Instant Login</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <!-- Google Login -->
            <Button variant="outline" class="h-12 gap-2 border-slate-100 bg-white px-4 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-all">
              <svg class="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>
            <!-- Facebook Login -->
            <Button 
              variant="outline" 
              class="h-12 gap-2 border-slate-100 bg-white px-4 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-all"
              @click="loginWithFacebook"
            >
              <svg class="h-5 w-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.248h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continue with Facebook
            </Button>
          </div>
        </div>

        <!-- Register Link -->
        <div class="text-center text-[11px] text-slate-400">
          <span>Don't have any acount? </span>
          <a href="#" class="font-bold text-blue-600 hover:underline">Register</a>
        </div>
      </div>
    </div>
  </div>
</template>
