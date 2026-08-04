import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import * as Linking from "expo-linking";
import AppRoutes from "./routes/AppRoutes";
import { GlobalProvider } from "./context/GlobalContext";
import FloatingCartButton from "./components/FloatingCartButton";
import { navigationRef } from "./routes/navigationRef";

const linking = {
  prefixes: ["rapidoo://"],
  config: {
    screens: {
      Login: "login",
      Home: "home",
      Restaurantes: "restaurantes",
      Produto: "produto",
      Carrinho: "carrinho",
      CheckoutMercadoPago: "checkout",
      AcompanhamentoPedido: "acompanhamento",
      Perfil: "perfil",
    },
  },
};

export default function App() {
  return (
    <GlobalProvider>
      <NavigationContainer ref={navigationRef} linking={linking}>
        <AppRoutes />
        <FloatingCartButton />
      </NavigationContainer>
    </GlobalProvider>
  );
}
