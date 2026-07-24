import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import { useGlobalContext } from "../context/GlobalContext";

export default function Carrinho() {
  const navigation = useNavigation();
  const {
    cart,
    aumentarQtd,
    diminuirQtd,
    removerDoCarrinho,
    cartTotal,
    finalizarPedido,
    userId,
    enderecos,
    salvarEndereco,
  } = useGlobalContext();

  const [loading, setLoading] = useState(false);

  // Modais de Endereço
  const [modalEnderecosVisivel, setModalEnderecosVisivel] = useState(false);
  const [modalNovoEnderecoVisivel, setModalNovoEnderecoVisivel] = useState(false);

  // Seleção de endereço existente
  const [enderecoSelecionadoId, setEnderecoSelecionadoId] = useState(null);

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

  // Atualiza seleção padrão se a lista de endereços mudar
  useEffect(() => {
    if (enderecos && enderecos.length > 0 && !enderecoSelecionadoId) {
      setEnderecoSelecionadoId(enderecos[0].id);
    }
  }, [enderecos]);

  function handleRemover(id) {
    Alert.alert(
      "Remover item",
      "Deseja remover este item do carrinho?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Remover", style: "destructive", onPress: () => removerDoCarrinho(id) },
      ]
    );
  }

  // Ação ao clicar no botão "Finalizar Pedido"
  function handleInicioFinalizarPedido() {
    if (cart.length === 0) {
      Alert.alert("Carrinho vazio", "Adicione itens ao carrinho antes de continuar.");
      return;
    }

    // Se possui endereços salvos, abre a tela de seleção
    if (enderecos && enderecos.length > 0) {
      setModalEnderecosVisivel(true);
    } else {
      // Se não possui endereço salvo, é obrigado a cadastrar um novo endereço
      setModalNovoEnderecoVisivel(true);
    }
  }

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
          "Precisamos da permissão de localização para entregar seu pedido corretamente. Ative a localização nas configurações do seu celular."
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

      // Opcional: Reverse geocode para auto-completar se estiver vazio
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

  // Confirmar Pedido com Endereço Existente Selecionado
  async function handleConfirmarComEnderecoExistente() {
    const endObj = enderecos.find((e) => e.id === enderecoSelecionadoId) || enderecos[0];
    if (!endObj) {
      Alert.alert("Atenção", "Selecione um endereço para entrega.");
      return;
    }

    setLoading(true);
    setModalEnderecosVisivel(false);
    try {
      const pedidoKey = await finalizarPedido(endObj);
      Alert.alert(
        "Pedido Realizado! 🎉",
        "Seu pedido foi registrado com sucesso! Deseja acompanhar a entrega?",
        [
          {
            text: "Acompanhar Pedido",
            onPress: () => navigation.navigate("AcompanhamentoPedido", { pedidoId: pedidoKey }),
          },
          {
            text: "Voltar para o Início",
            onPress: () => navigation.navigate("Home"),
          },
        ]
      );
    } catch (error) {
      Alert.alert("Erro", "Não foi possível finalizar o pedido. Tente novamente.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // Confirmar Pedido salvando Novo Endereço Obrigatório
  async function handleSalvarEConfirmarNovoEndereco() {
    if (!cep.trim() || !rua.trim() || !numero.trim() || !bairro.trim() || !cidade.trim()) {
      Alert.alert(
        "Campos Obrigatórios",
        "Por favor, preencha o CEP, Endereço completo, Número, Bairro e Cidade para a entrega."
      );
      return;
    }

    if (!coordenadas) {
      Alert.alert(
        "Localização Obrigatória 📍",
        "Por favor, clique no botão \"Ativar/Capturar Minha Localização GPS\" para podermos entregar seu pedido no local exato."
      );
      return;
    }

    setLoading(true);
    setModalNovoEnderecoVisivel(false);

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

      // Salva o endereço na conta do usuário
      const endSalvo = await salvarEndereco(novoEndereco);

      // Finaliza o pedido com esse endereço
      const pedidoKey = await finalizarPedido(endSalvo);

      // Limpa os campos do formulário
      setCep("");
      setRua("");
      setNumero("");
      setBairro("");
      setCidade("");
      setEstado("");
      setComplemento("");
      setCoordenadas(null);

      Alert.alert(
        "Pedido Realizado! 🎉",
        "Seu pedido foi registrado com sucesso! Deseja acompanhar a entrega?",
        [
          {
            text: "Acompanhar Pedido",
            onPress: () => navigation.navigate("AcompanhamentoPedido", { pedidoId: pedidoKey }),
          },
          {
            text: "Voltar para o Início",
            onPress: () => navigation.navigate("Home"),
          },
        ]
      );
    } catch (error) {
      Alert.alert("Erro", "Não foi possível finalizar o pedido. Tente novamente.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function renderItem({ item }) {
    const itemAdicionais = item.adicionais || [];
    const itemRemovidos = item.removidos || [];

    return (
      <View style={styles.card}>
        {item.imagem ? (
          <Image source={{ uri: item.imagem }} style={styles.image} />
        ) : (
          <View style={[styles.image, { backgroundColor: "#E0E0E0" }]} />
        )}
        <View style={styles.info}>
          <Text style={styles.nome}>{item.nome}</Text>
          <Text style={styles.preco}>
            R$ {(item.preco || 0).toFixed(2).replace(".", ",")}
          </Text>

          {itemAdicionais.length > 0 && (
            <>
              <Text style={styles.titulo}>Adicionais:</Text>
              {itemAdicionais.map((add, index) => (
                <Text key={index} style={styles.extra}>
                  • {add.nome} (+R$ {(add.preco || 0).toFixed(2).replace(".", ",")})
                </Text>
              ))}
            </>
          )}

          {itemRemovidos.length > 0 && (
            <>
              <Text style={styles.titulo}>Removidos:</Text>
              <Text style={styles.removido}>{itemRemovidos.join(", ")}</Text>
            </>
          )}

          {item.observacao ? (
            <Text style={styles.obsText}>Obs: {item.observacao}</Text>
          ) : null}

          <View style={styles.bottom}>
            <View style={styles.quantidade}>
              <TouchableOpacity
                onPress={() => diminuirQtd(item.id)}
                style={styles.botaoQtd}
              >
                <Text style={styles.qtdText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.numero}>{item.quantidade}</Text>
              <TouchableOpacity
                onPress={() => aumentarQtd(item.id)}
                style={styles.botaoQtd}
              >
                <Text style={styles.qtdText}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => handleRemover(item.id)}>
              <Text style={styles.remover}>Remover</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (cart.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>Seu carrinho está vazio</Text>
        <Text style={styles.emptySub}>
          Navegue pelos restaurantes e adicione seus pratos favoritos!
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.emptyButtonText}>Ver Restaurantes</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={cart}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 15,
          paddingBottom: 170,
        }}
      />

      <View style={styles.footer}>
        {userId && (
          <Text style={styles.userLabel}>
            ID Usuário: <Text style={{ fontWeight: "normal", fontSize: 12 }}>{userId}</Text>
          </Text>
        )}
        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Total</Text>
          <Text style={styles.total}>
            R$ {cartTotal.toFixed(2).replace(".", ",")}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleInicioFinalizarPedido}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Finalizar Pedido</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL 1: SELEÇÃO DE ENDEREÇO EXISTENTE */}
      <Modal
        visible={modalEnderecosVisivel}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalEnderecosVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Endereço de Entrega</Text>
              <TouchableOpacity onPress={() => setModalEnderecosVisivel(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Selecione o endereço onde você deseja receber este pedido:
            </Text>

            <ScrollView style={{ maxHeight: 280, marginVertical: 10 }}>
              {enderecos.map((item) => {
                const isSelected = item.id === enderecoSelecionadoId;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.addressCard, isSelected && styles.addressCardSelected]}
                    onPress={() => setEnderecoSelecionadoId(item.id)}
                  >
                    <View style={styles.radioCircle}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.addressTextBold}>
                        {item.rua}, {item.numero}
                      </Text>
                      <Text style={styles.addressTextSub}>
                        {item.bairro} - {item.cidade} ({item.cep})
                      </Text>
                      {item.complemento ? (
                        <Text style={styles.addressTextSub}>Comp: {item.complemento}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.addAddressButton}
              onPress={() => {
                setModalEnderecosVisivel(false);
                setModalNovoEnderecoVisivel(true);
              }}
            >
              <Text style={styles.addAddressText}>+ Cadastrar novo endereço</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirmarComEnderecoExistente}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirmar e Finalizar Pedido</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: CADASTRO DE NOVO ENDEREÇO E LOCALIZAÇÃO OBRIGATÓRIA */}
      <Modal
        visible={modalNovoEnderecoVisivel}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalNovoEnderecoVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "90%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Informe seu Endereço</Text>
              <TouchableOpacity onPress={() => setModalNovoEnderecoVisivel(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSub}>
                Preencha seu endereço completo e ative a localização para garantirmos uma entrega precisa:
              </Text>

              {/* BOTAO LOCALIZACAO GPS */}
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
                        : "Ativar / Capturar Minha Localização GPS *"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* CAMPOS DO FORMULARIO */}
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
                style={[styles.confirmButton, { marginTop: 15 }]}
                onPress={handleSalvarEConfirmarNovoEndereco}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Salvar Endereço e Finalizar Pedido</Text>
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FFF",
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#6B3FE4",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  emptyButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 15,
    overflow: "hidden",
    elevation: 2,
  },
  image: {
    width: 110,
    height: 110,
  },
  info: {
    flex: 1,
    padding: 12,
  },
  nome: {
    fontSize: 17,
    fontWeight: "700",
  },
  preco: {
    fontSize: 17,
    color: "#6B3FE4",
    fontWeight: "bold",
    marginTop: 3,
  },
  titulo: {
    marginTop: 8,
    fontWeight: "600",
    color: "#555",
  },
  extra: {
    color: "#666",
    marginTop: 2,
    fontSize: 13,
  },
  removido: {
    color: "#d9534f",
    marginTop: 2,
    fontSize: 13,
  },
  obsText: {
    color: "#888",
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 4,
  },
  bottom: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantidade: {
    flexDirection: "row",
    alignItems: "center",
  },
  botaoQtd: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#6B3FE4",
    justifyContent: "center",
    alignItems: "center",
  },
  qtdText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  numero: {
    marginHorizontal: 15,
    fontWeight: "bold",
    fontSize: 16,
  },
  remover: {
    color: "#E53935",
    fontWeight: "700",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
    padding: 18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  userLabel: {
    fontSize: 11,
    color: "#888",
    marginBottom: 6,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  totalText: {
    fontSize: 18,
    fontWeight: "600",
  },
  total: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#6B3FE4",
  },
  button: {
    backgroundColor: "#6B3FE4",
    height: 55,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  /* ESTILOS DOS MODAIS */
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
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  addressCardSelected: {
    borderColor: "#6B3FE4",
    backgroundColor: "#EFE8FD",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#6B3FE4",
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#6B3FE4",
  },
  addressTextBold: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#222",
  },
  addressTextSub: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  addAddressButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  addAddressText: {
    color: "#6B3FE4",
    fontWeight: "bold",
    fontSize: 15,
  },
  confirmButton: {
    backgroundColor: "#6B3FE4",
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  /* BOTAO GEOLOCALIZACAO */
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
});
