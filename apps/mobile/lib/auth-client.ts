import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { apiUrl } from "./api-url";

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
