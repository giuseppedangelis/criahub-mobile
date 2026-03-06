import { Redirect, useLocalSearchParams } from "expo-router";
import { AnimalDetailScreen } from "@/src/screens/AnimalDetailScreen";
import { VetAnimalChartScreen } from "@/src/screens/VetAnimalChartScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { isVeterinaryRole } from "@/src/lib/roles";

export default function AnimalDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { role } = useAuth();
  if (isVeterinaryRole(role) && params.id) {
    return <Redirect href={{ pathname: "/(app)/vet-prontuario/[id]", params: { id: String(params.id) } }} />;
  }
  if (isVeterinaryRole(role)) return <VetAnimalChartScreen />;
  return <AnimalDetailScreen />;
}
