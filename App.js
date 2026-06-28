import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Dimensions, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [counter, setCounter] = useState(0);

  // كود فحص وحماية الأوفلاين الأساسي المستقر
  useEffect(() => {
    async function loadData() {
      try {
        const savedCounter = await AsyncStorage.getItem('saved_counter');
        if (savedCounter !== null) {
          setCounter(parseInt(savedCounter));
        }
      } catch (error) {
        console.log("Offline mode active: ", error);
      }
    }
    loadData();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>مُصلِّي</Text>
        <Text style={styles.text}>التطبيق جاهز ومستقر للرفع على المتجر</Text>
        <Text style={styles.source}>المصادر موثقة: Tanzil.net & الهيئة العامة للمساحة</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  text: {
    fontSize: 18,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 30,
  },
  source: {
    fontSize: 12,
    color: '#bdc3c7',
    position: 'absolute',
    bottom: 20,
  },
});
