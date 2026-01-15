export const signIn = {
    email: async () => ({ error: null }),
    social: async () => ({ error: null }),
};
export const signUp = {
    email: async () => ({ error: null }),
};
export const signOut = async () => { };
export const useSession = () => ({
    data: {
        user: {
            id: "local-user",
            name: "AI Director",
            email: "ai@director.com",
            image: "",
        },
        session: {
            id: "local-session"
        }
    },
    isPending: false,
});

export const authClient = {
    useSession,
    signIn,
    signOut,
    signUp
};
