"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { toggleMealEaten } from "./actions";
import { cn } from "@/lib/utils";

export default function MealToggle({ mealId, initialIsEaten }: { mealId: string, initialIsEaten: boolean }) {
  const [isEaten, setIsEaten] = useState(initialIsEaten);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextState = !isEaten;
    setIsEaten(nextState);
    
    startTransition(async () => {
      const result = await toggleMealEaten(mealId, nextState);
      if (result.error) {
        // Revert on error
        setIsEaten(isEaten);
        alert("Failed to update meal status");
      }
    });
  };

  return (
    <button 
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        "transition-all duration-200 p-1 rounded-full hover:bg-emerald-50",
        isPending && "opacity-50 cursor-not-allowed"
      )}
      title={isEaten ? "Mark as not eaten" : "Mark as eaten"}
      aria-label={isEaten ? "Mark as not eaten" : "Mark as eaten"}
    >
      <CheckCircle2 className={cn(
        "w-5 h-5 transition-colors",
        isEaten ? "text-emerald-500 fill-emerald-50" : "text-gray-300"
      )} />
    </button>
  );
}
