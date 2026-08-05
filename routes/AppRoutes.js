import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import Login from "../screens/Login";
import Home from "../screens/Home";
import Restaurantes from "../screens/Restaurantes";
import Produto from "../screens/Produto";
import Carrinho from "../screens/Carrinho";
import AcompanhamentoPedido from "../screens/AcompanhamentoPedido";
import Perfil from "../screens/Perfil";
import CheckoutAsaas from "../screens/CheckoutAsaas";

const Stack = createNativeStackNavigator();

export default function AppRoutes() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  if (initializing) {
    return null;
  }

  return (
    <Stack.Navigator
      initialRouteName={user ? "Home" : "Login"}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="Restaurantes" component={Restaurantes} />
      <Stack.Screen name="Produto" component={Produto} />
      <Stack.Screen name="Carrinho" component={Carrinho} />
      <Stack.Screen name="CheckoutAsaas" component={CheckoutAsaas}/>
      <Stack.Screen name="AcompanhamentoPedido" component={AcompanhamentoPedido} />
      <Stack.Screen name="Perfil" component={Perfil} />
    </Stack.Navigator>
  );
}
