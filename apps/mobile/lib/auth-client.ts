import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const apiUrl = Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:3001";

export const authClient = createAuthClient({
    baseURL: apiUrl,
    fetchOptions: {
        headers: {
            Origin: apiUrl,
        },
    },
    plugins: [
        expoClient({
            scheme: "smallbreeze-mobile",
            storagePrefix: "myapp",
            storage: SecureStore,
        })
    ]
});
