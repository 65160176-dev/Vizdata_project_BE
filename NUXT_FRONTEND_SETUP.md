// Nuxt 3 Frontend - API Configuration
// Install: npm install axios

// plugins/axios.ts
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  
  const axios = $fetch.create({
    baseURL: config.public.apiBase || 'http://localhost:3000',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  return {
    provide: {
      axios,
    },
  };
});

// nuxt.config.ts - Add this to your config
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000',
    },
  },
});

// .env file in Nuxt project
// NUXT_PUBLIC_API_BASE=http://localhost:3000

// Example usage in components/pages:
// const { $axios } = useNuxtApp();
// 
// // Get all users
// const users = await $axios('/users');
// 
// // Create user
// const newUser = await $axios('/users', {
//   method: 'POST',
//   body: JSON.stringify({
//     username: 'johndoe',
//     email: 'john@example.com',
//     password: 'password123'
//   })
// });
// 
// // Update user
// const updated = await $axios(`/users/${userId}`, {
//   method: 'PATCH',
//   body: JSON.stringify({ username: 'newname' })
// });
// 
// // Delete user
// await $axios(`/users/${userId}`, { method: 'DELETE' });
