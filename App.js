import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import AppRoutes from "./routes/AppRoutes";
import { GlobalProvider } from "./context/GlobalContext";
import FloatingCartButton from "./components/FloatingCartButton";
import { navigationRef } from "./routes/navigationRef";

export default function App() {
  return (
    <GlobalProvider>
      <NavigationContainer ref={navigationRef}>
        <AppRoutes />
        <FloatingCartButton />
      </NavigationContainer>
    </GlobalProvider>
  );
}
