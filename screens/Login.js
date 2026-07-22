import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import * as Google from 'expo-auth-session/providers/google';

const Stack = createNativeStackNavigator();

const isPlaceholderConfig = (value) => typeof value === 'string' && value.startsWith('SUA') || typeof value === 'string' && value.startsWith('SEU');

function AuthScreen({ navigation }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  

  const handleSubmit = async () => {
    console.log("LOGIN OK");
  if (!email.trim() || !password.trim()) {
    console.log("2 - campos vazios");
    setMessage("Preencha e-mail e senha.");
    return;
  }
  
  if (password.length < 6) {
     console.log("3 - senha pequena");
    setMessage("A senha precisa ter pelo menos 6 caracteres.");
    return;
  }
  

  console.log("4 - passou validações");
  setLoading(true);
  setMessage("");

  try {
    console.log("5 - entrou no try");
    if (mode === "register") {

      if (!name.trim()) {
        setMessage("Informe seu nome para continuar.");
        return;
      }
       console.log("6 - tentando cadastrar");
      await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      console.log("LOGIN OK");
      navigation.replace("Home");

    } else {

      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
        //const navigation = useNavigation();
        navigation.replace("Home");

    }

  } catch (error) {

    if (error.code === "auth/email-already-in-use") {
      setMessage("Este e-mail já está cadastrado.");
    } else if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/user-not-found"
    ) {
      setMessage("E-mail ou senha inválidos.");
    } else {
      setMessage(error.message);
    }

  } finally {
    setLoading(false);
  }
};

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setMessage('');
  };

  return (
    <LinearGradient colors={['#f8f1ff', '#ffffff', '#f3f7ff']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
          <View style={styles.logoBox}>
          <Image source={require('../assets/sublogo.png')} style={{ width: "80%", height: 80, marginBottom: 8 }} />
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>{mode === 'login' ? 'Entrar' : 'Criar conta'}</Text>
            <Text style={styles.subtitle}>Uma experiência clean para o seu app.</Text>

            {mode === 'register' && (
              <TextInput
                style={styles.input}
                placeholder="Nome"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="E-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{mode === 'login' ? 'Entrar' : 'Cadastrar'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleMode} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{mode === 'login' ? 'Ainda não tem conta? Cadastre-se' : 'Já possui conta? Entrar'}</Text>
            </TouchableOpacity>

            {message ? <Text style={styles.message}>{message}</Text> : null}
            
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

export default AuthScreen;

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  logoBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingVertical: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e5d9f8',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6b3fe4',
  },
  logoSubtext: {
    marginTop: 6,
    color: '#7d7f91',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2430',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 16,
    color: '#6f7284',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e4dff7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: '#faf9ff',
    color: '#1f2430',
  },
  primaryButton: {
    marginTop: 6,
    backgroundColor: '#6b3fe4',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#6b3fe4',
    fontWeight: '600',
  },
  message: {
    marginTop: 12,
    color: '#1f7a4f',
    fontWeight: '600',
    textAlign: 'center',
  },
  notice: {
    marginTop: 8,
    color: '#8c8fa3',
    fontSize: 12,
    textAlign: 'center',
  },
});
