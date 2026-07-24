import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Login from "../screens/Login";
import Home from "../screens/Home";
import Restaurantes from "../screens/Restaurantes";
import Produto from "../screens/Produto";
import Carrinho from "../screens/Carrinho";
import AcompanhamentoPedido from "../screens/AcompanhamentoPedido";
import Perfil from "../screens/Perfil";

const Stack = createNativeStackNavigator();

export default function AppRoutes() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="Restaurantes" component={Restaurantes} />
      <Stack.Screen name="Produto" component={Produto} />
      <Stack.Screen name="Carrinho" component={Carrinho} />
      <Stack.Screen name="AcompanhamentoPedido" component={AcompanhamentoPedido} />
      <Stack.Screen name="Perfil" component={Perfil} />
    </Stack.Navigator>
  );
}
