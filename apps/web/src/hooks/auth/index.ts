import { authApi, type AuthTokens } from "../../api/auth";
import { useAuthStore } from "../../lib/stores/authStore";
import { showError, showSuccess } from "../../lib/toast";
import type { User } from "@shift-sync/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

export const useLogin = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setAuth, logout } = useAuthStore();
  
  const { mutate, ...rest } = useMutation({
    mutationKey: ['login'],
    mutationFn: ({ email, password }: { email: string; password: string }) => 
      authApi.login(email, password) as Promise<AuthTokens & { user: User }>,

    onSuccess: (data) => {
      if (data?.accessToken && data?.refreshToken && data?.user) {
        setAuth(data.user, data.accessToken, data.refreshToken);
        queryClient.invalidateQueries();
        showSuccess("Welcome back!", `Logged in as ${data.user.name}`);
        
        // Navigate based on user role
        switch (data.user.role) {
          case 'ADMIN':
            navigate({ to: '/schedule' });
            break;
          case 'MANAGER':
            navigate({ to: '/schedule' });
            break;
          case 'STAFF':
            navigate({ to: '/my-shifts' });
            break;
          default:
            navigate({ to: '/' });
        }
      } else {
        logout();
      }
    },
    onError: (error: Error) => {
      showError("Login failed", error.message || "Invalid email or password");
      logout();
    }
  });

  return { login: mutate, ...rest };
};

export const useRegister = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setAuth, logout } = useAuthStore();
  
  const { mutate, ...rest } = useMutation({
    mutationKey: ['register'],
    mutationFn: (data: {
      email: string;
      password: string;
      name: string;
      role?: 'ADMIN' | 'MANAGER' | 'STAFF';
      timezone?: string;
      desiredHours?: number;
    }) => authApi.register(data) as Promise<AuthTokens & { user: User }>,

    onSuccess: (data) => {
      if (data?.accessToken && data?.refreshToken && data?.user) {
        setAuth(data.user, data.accessToken, data.refreshToken);
        queryClient.invalidateQueries();
        showSuccess("Welcome!", `Account created for ${data.user.name}`);
        
        // Navigate based on user role
        switch (data.user.role) {
          case 'ADMIN':
            navigate({ to: '/schedule' });
            break;
          case 'MANAGER':
            navigate({ to: '/schedule' });
            break;
          case 'STAFF':
            navigate({ to: '/my-shifts' });
            break;
          default:
            navigate({ to: '/' });
        }
      } else {
        logout();
      }
    },
    onError: (error: Error) => {
      showError("Registration failed", error.message || "Could not create account");
      logout();
    }
  });

  return { register: mutate, ...rest };
};

export const useRefreshToken = () => {
  const { refreshToken, setTokens, logout } = useAuthStore();
  
  return useMutation({
    mutationKey: ['refreshToken'],
    mutationFn: () => {
      if (!refreshToken) throw new Error("No refresh token");
      return authApi.refresh(refreshToken) as Promise<AuthTokens>;
    },
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
    },
    onError: () => {
      logout();
    }
  });
};

export const useUser = () => {
  const { isAuthenticated } = useAuthStore();
  
  return useQuery({
    queryKey: ['user'],
    queryFn: () => authApi.me() as Promise<User>,
    enabled: isAuthenticated,
    staleTime: Infinity,
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  
  const { mutate } = useMutation({
    mutationKey: ['logout'],
    mutationFn: async () => {
      logout();
      queryClient.clear();
    },
    onSuccess: () => {
      navigate({ to: '/auth/login' });
    }
  });

  return { logout: mutate };
};
