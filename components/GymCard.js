import { useState } from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import { getPriceExplanation } from '../data/gymLogic';

// Fitness center kortet for fitnesscentrene. Gentages for hver fitness center i listen på dashboard siden. 
export default function GymCard({ gym, isRecommended }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={GlobalStyle.card}>
      <View style={GlobalStyle.cardHeader}>
        <Text style={GlobalStyle.cardTitle}>{gym.name}</Text>
        {isRecommended && (
          <View style={GlobalStyle.badge}>
            <Text style={GlobalStyle.badgeText}>ANBEFALET</Text>
          </View>
        )}
      </View>

      <Text style={GlobalStyle.priceText}>{gym.honestYearlyPrice} kr/md (ærlig årspris)</Text>
      <Text style={GlobalStyle.distanceText}>{gym.distanceKm} km fra dig</Text>

      <Pressable onPress={() => setExpanded(!expanded)}>
        <Text style={GlobalStyle.link}>Om tilbuddet {expanded ? '↑' : '↓'}</Text>
      </Pressable>

      {expanded && (
        <View style={GlobalStyle.detailsBox}>
          <Text style={GlobalStyle.detailsHeading}>Sådan er prisen beregnet</Text>
          <Text>{getPriceExplanation(gym)}</Text>

          <Text style={GlobalStyle.detailsHeading}>Matcher dine præferencer</Text>
          <Text>Abonnementstype: {gym.subscriptionType}</Text>
          <Text>Maskiner: {gym.machines.join(', ')}</Text>
          <Text>Sauna: {gym.sauna ? 'Ja' : 'Nej'}</Text>
        </View>
      )}

      <ButtonComponent title="Tilmeld dig" type="primary" onPress={() => Linking.openURL(gym.website)} />
    </View>
  );
}
