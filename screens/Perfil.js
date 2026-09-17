import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { remove, ref as dbRef } from 'firebase/database';
import { deleteUser } from 'firebase/auth';
import { auth, database } from '../firebaseConfig';
import * as Location from "expo-location";
import { useGlobalContext } from "../context/GlobalContext";

export default function Perfil() {
  const navigation = useNavigation();
  const { user, userId, enderecos, salvarEndereco, removerEndereco, deslogar } =
    useGlobalContext();

  const [modalNovoEndereco, setModalNovoEndereco] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Formulário de Novo Endereço
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [complemento, setComplemento] = useState("");
  const [coordenadas, setCoordenadas] = useState(null);

  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingSalvar, setLoadingSalvar] = useState(false);

  // Buscar dados do CEP via ViaCEP
  async function handleBuscarCep(text) {
    const cepLimpo = text.replace(/\D/g, "");
    setCep(text);

    if (cepLimpo.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setRua(data.logradouro || "");
          setBairro(data.bairro || "");
          setCidade(data.localidade || "");
          setEstado(data.uf || "");
        } else {
          Alert.alert("CEP não encontrado", "Verifique o CEP digitado.");
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      } finally {
        setLoadingCep(false);
      }
    }
  }

  // Capturar Localização GPS via Expo Location
  async function handleObterLocalizacao() {
    setLoadingGeo(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão Negada",
          "Precisamos da permissão de localização para salvar sua localização exata."
        );
        setLoadingGeo(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCoordenadas({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      try {
        let geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (geocode && geocode.length > 0) {
          const item = geocode[0];
          if (!rua && item.street) setRua(item.street);
          if (!bairro && item.district) setBairro(item.district);
          if (!cidade && item.city) setCidade(item.city);
          if (!estado && item.region) setEstado(item.region);
          if (!cep && item.postalCode) setCep(item.postalCode);
        }
      } catch (e) {
        console.log("Erro no reverse geocode:", e);
      }

      Alert.alert("Sucesso 📍", "Sua localização exata foi capturada com sucesso!");
    } catch (error) {
      console.error("Erro ao obter localização:", error);
      Alert.alert("Erro", "Não foi possível obter a localização. Verifique se o GPS está ligado.");
    } finally {
      setLoadingGeo(false);
    }
  }

  async function handleSalvarNovoEndereco() {
    if (!cep.trim() || !rua.trim() || !numero.trim() || !bairro.trim() || !cidade.trim()) {
      Alert.alert(
        "Campos Obrigatórios",
        "Por favor, preencha o CEP, Endereço/Rua, Número, Bairro e Cidade."
      );
      return;
    }

    setLoadingSalvar(true);
    try {
      const novoEndereco = {
        cep: cep.trim(),
        rua: rua.trim(),
        numero: numero.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        estado: estado.trim(),
        complemento: complemento.trim(),
        coordenadas,
      };

      await salvarEndereco(novoEndereco);

      setCep("");
      setRua("");
      setNumero("");
      setBairro("");
      setCidade("");
      setEstado("");
      setComplemento("");
      setCoordenadas(null);
      setModalNovoEndereco(false);

      Alert.alert("Sucesso 🎉", "Endereço cadastrado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar endereço:", error);
      Alert.alert("Erro", "Não foi possível salvar o endereço.");
    } finally {
      setLoadingSalvar(false);
    }
  }

  function handleRemoverEndereco(id) {
    Alert.alert("Remover Endereço", "Tem certeza que deseja excluir este endereço?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => removerEndereco(id),
      },
    ]);
  }

  function handleSair() {
    setLogoutConfirmVisible(true);
  }

  async function confirmLogout() {
    setLogoutLoading(true);
    try {
      await deslogar();
      // Reset navigation stack to Login to avoid going back
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      console.error('Erro ao deslogar:', error);
      Alert.alert('Erro', 'Não foi possível deslogar. Tente novamente.');
    } finally {
      setLogoutLoading(false);
      setLogoutConfirmVisible(false);
    }
  }

  function handleExcluirConta() {
    setDeleteConfirmVisible(true);
  }

  async function confirmDeleteAccount() {
    if (!user || !user.uid) {
      Alert.alert('Erro', 'Usuário não encontrado.');
      return;
    }

    setDeleteLoading(true);
    try {
      // remover dados do usuário no Realtime Database
      await remove(dbRef(database, `usuarios/${user.uid}`));

      // tente deletar o usuário no Firebase Auth
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }

      // reset nav
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Reautenticação necessária', 'Por segurança, faça login novamente antes de excluir sua conta.');
      } else {
        Alert.alert('Erro', 'Não foi possível excluir a conta. Tente novamente mais tarde.');
      }
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmVisible(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* CARD DADOS DO USUÁRIO */}
        <View style={styles.userCard}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarIcon}>👤</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.displayName || (user?.email ? user.email.split("@")[0] : "Usuário E-Food")}
            </Text>
            <Text style={styles.userEmail}>{user?.email || "Visitante"}</Text>
            {userId && (
              <Text style={styles.userIdText}>ID: {userId.slice(0, 12)}...</Text>
            )}
          </View>
        </View>

        {/* SEÇÃO MEUS ENDEREÇOS */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>📍 Meus Endereços Salvos</Text>
            <TouchableOpacity
              style={styles.addSmallButton}
              onPress={() => setModalNovoEndereco(true)}
            >
              <Text style={styles.addSmallButtonText}>+ Adicionar</Text>
            </TouchableOpacity>
          </View>

          {enderecos && enderecos.length > 0 ? (
            enderecos.map((item) => (
              <View key={item.id} style={styles.addressCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressRua}>
                    {item.rua}, {item.numero}
                  </Text>
                  <Text style={styles.addressSub}>
                    {item.bairro} - {item.cidade} / {item.estado || "MG"}
                  </Text>
                  {item.cep ? (
                    <Text style={styles.addressSub}>CEP: {item.cep}</Text>
                  ) : null}
                  {item.complemento ? (
                    <Text style={styles.addressSub}>
                      Comp: {item.complemento}
                    </Text>
                  ) : null}
                  {item.coordenadas ? (
                    <View style={styles.geoBadge}>
                      <Text style={styles.geoBadgeText}>
                        📍 Localização GPS salva
                      </Text>
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.deleteAddressButton}
                  onPress={() => handleRemoverEndereco(item.id)}
                >
                  <Text style={styles.deleteAddressText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyAddressBox}>
              <Text style={styles.emptyAddressText}>
                Você ainda não possui nenhum endereço salvo.
              </Text>
              <TouchableOpacity
                style={styles.addBigButton}
                onPress={() => setModalNovoEndereco(true)}
              >
                <Text style={styles.addBigButtonText}>
                  + Cadastrar Endereço
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* SEÇÃO AÇÕES DA CONTA */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>⚙️ Configurações da Conta</Text>

          {user ? (
            <TouchableOpacity style={styles.logoutButton} onPress={handleSair}>
              <Text style={styles.logoutButtonText}>🚪 Sair da Conta</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.loginButtonText}>🔑 Fazer Login / Criar Conta</Text>
            </TouchableOpacity>
          )}

          {user ? (
            <TouchableOpacity style={styles.deleteAccountButton} onPress={handleExcluirConta}>
              <Text style={styles.deleteAccountText}>🗑️ Excluir conta</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>

      {/* MODAL CONFIRMAR LOGOUT */}
      <Modal
        visible={logoutConfirmVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setLogoutConfirmVisible(false)}
      >
        <View style={[styles.modalOverlay, { justifyContent: 'center' }] }>
          <View style={[styles.modalContent, { marginHorizontal: 24, borderRadius: 12 }] }>
            <Text style={[styles.modalTitle, { textAlign: 'center' }]}>Sair da Conta</Text>
            <Text style={{ textAlign: 'center', color: '#666', marginTop: 8 }}>Deseja realmente sair da sua conta?</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 }}>
              <TouchableOpacity
                style={[styles.cancelButton]}
                onPress={() => setLogoutConfirmVisible(false)}
                disabled={logoutLoading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton]}
                onPress={confirmLogout}
                disabled={logoutLoading}
              >
                {logoutLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Sair</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL EXCLUIR CONTA */}
      <Modal
        visible={deleteConfirmVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={[styles.modalOverlay, { justifyContent: 'center' }] }>
          <View style={[styles.modalContent, { marginHorizontal: 24, borderRadius: 12 }] }>
            <Text style={[styles.modalTitle, { textAlign: 'center' }]}>Excluir Conta</Text>
            <Text style={{ textAlign: 'center', color: '#666', marginTop: 8 }}>Esta ação é irreversível. Deseja realmente excluir sua conta e todos os dados?</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 }}>
              <TouchableOpacity
                style={[styles.cancelButton]}
                onPress={() => setDeleteConfirmVisible(false)}
                disabled={deleteLoading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteConfirmButton]}
                onPress={confirmDeleteAccount}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteConfirmButtonText}>Excluir</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL ADICIONAR NOVO ENDEREÇO */}
      <Modal
        visible={modalNovoEndereco}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalNovoEndereco(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "90%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Endereço</Text>
              <TouchableOpacity onPress={() => setModalNovoEndereco(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSub}>
                Preencha os dados abaixo para salvar um novo endereço de entrega:
              </Text>

              {/* BOTAO GEOLOCALIZACAO */}
              <TouchableOpacity
                style={[
                  styles.geoButton,
                  coordenadas && { backgroundColor: "#E8F5E9", borderColor: "#4CAF50" },
                ]}
                onPress={handleObterLocalizacao}
                disabled={loadingGeo}
              >
                {loadingGeo ? (
                  <ActivityIndicator color="#6B3FE4" />
                ) : (
                  <>
                    <Text style={styles.geoButtonIcon}>
                      {coordenadas ? "✅" : "📍"}
                    </Text>
                    <Text style={[styles.geoButtonText, coordenadas && { color: "#2E7D32" }]}>
                      {coordenadas
                        ? "Localização Capturada com Sucesso!"
                        : "Ativar / Capturar Localização GPS (Opcional)"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* FORMULARIO */}
              <Text style={styles.inputLabel}>CEP *</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="00000-000"
                  keyboardType="numeric"
                  value={cep}
                  onChangeText={handleBuscarCep}
                  maxLength={9}
                />
                {loadingCep && <ActivityIndicator color="#6B3FE4" style={{ marginLeft: 10 }} />}
              </View>

              <Text style={styles.inputLabel}>Endereço / Rua *</Text>
              <TextInput
                style={styles.input}
                placeholder="Rua, Avenida, Alameda..."
                value={rua}
                onChangeText={setRua}
              />

              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ width: "48%" }}>
                  <Text style={styles.inputLabel}>Número *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 123"
                    keyboardType="numeric"
                    value={numero}
                    onChangeText={setNumero}
                  />
                </View>

                <View style={{ width: "48%" }}>
                  <Text style={styles.inputLabel}>Bairro *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Bairro"
                    value={bairro}
                    onChangeText={setBairro}
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ width: "68%" }}>
                  <Text style={styles.inputLabel}>Cidade *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Cidade"
                    value={cidade}
                    onChangeText={setCidade}
                  />
                </View>

                <View style={{ width: "28%" }}>
                  <Text style={styles.inputLabel}>Estado *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="MG"
                    maxLength={2}
                    autoCapitalize="characters"
                    value={estado}
                    onChangeText={setEstado}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Complemento / Ponto de Referência</Text>
              <TextInput
                style={styles.input}
                placeholder="Apto 101, Bloco B, Próximo à padaria..."
                value={complemento}
                onChangeText={setComplemento}
              />

              <TouchableOpacity
                style={[styles.saveButton, { marginTop: 15 }]}
                onPress={handleSalvarNovoEndereco}
                disabled={loadingSalvar}
              >
                {loadingSalvar ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Salvar Endereço</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EFE8FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarIcon: {
    fontSize: 30,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  userIdText: {
    fontSize: 11,
    color: "#888",
    marginTop: 4,
  },
  sectionContainer: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#222",
  },
  addSmallButton: {
    backgroundColor: "#EFE8FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addSmallButtonText: {
    color: "#6B3FE4",
    fontWeight: "bold",
    fontSize: 13,
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  addressRua: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#222",
  },
  addressSub: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  geoBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  geoBadgeText: {
    fontSize: 11,
    color: "#2E7D32",
    fontWeight: "600",
  },
  deleteAddressButton: {
    padding: 10,
  },
  deleteAddressText: {
    fontSize: 18,
  },
  emptyAddressBox: {
    alignItems: "center",
    paddingVertical: 14,
  },
  emptyAddressText: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
  },
  addBigButton: {
    backgroundColor: "#6B3FE4",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBigButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  logoutButton: {
    backgroundColor: '#6B3FE4',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F4F5F7',
    paddingVertical: 12,
    borderRadius: 10,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#6B3FE4',
    paddingVertical: 12,
    borderRadius: 10,
    marginLeft: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
  deleteAccountButton: {
    marginTop: 12,
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F2C0C0',
  },
  deleteAccountText: {
    color: '#C62828',
    fontWeight: '700',
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: '#C62828',
    paddingVertical: 12,
    borderRadius: 10,
    marginLeft: 8,
    alignItems: 'center',
  },
  deleteConfirmButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  loginButton: {
    backgroundColor: "#6B3FE4",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  loginButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 15,
  },
  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
  },
  closeButton: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#999",
    padding: 5,
  },
  modalSub: {
    fontSize: 14,
    color: "#666",
    marginBottom: 14,
  },
  geoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFE8FD",
    borderWidth: 1.5,
    borderColor: "#6B3FE4",
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  geoButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  geoButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#6B3FE4",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444",
    marginBottom: 4,
    marginTop: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    backgroundColor: "#F4F5F7",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#222",
  },
  saveButton: {
    backgroundColor: "#6B3FE4",
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
