import { AnimalDetailScreen } from "@/src/screens/AnimalDetailScreen";
import { VetAnimalChartScreen } from "@/src/screens/VetAnimalChartScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { isVeterinaryRole } from "@/src/lib/roles";

export default function AnimalDetailRoute() {
  const { role } = useAuth();
  if (isVeterinaryRole(role)) return <VetAnimalChartScreen />;
  return <AnimalDetailScreen />;
}
