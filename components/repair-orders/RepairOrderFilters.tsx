/**
 * Repair Order Filters Component
 * Search and technician filter for repair orders
 */

"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RepairOrderFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedTechnician: string;
  setSelectedTechnician: (technician: string) => void;
  uniqueTechnicians: string[];
}

export function RepairOrderFilters({
  searchTerm,
  setSearchTerm,
  selectedTechnician,
  setSelectedTechnician,
  uniqueTechnicians,
}: RepairOrderFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1 sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-white/50 z-10" />
        <Input
          placeholder="Search by order #, technician, or customer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-10 pl-9 pr-9 w-full rounded-[28px] bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-violet-400/30 dark:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-white/40"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchTerm("")}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-gray-500 dark:text-white/60"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Technician Filter */}
      <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
        <SelectTrigger className="h-10 w-full sm:w-48 rounded-[28px] border border-violet-400/30 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-gray-900 dark:text-white">
          <SelectValue placeholder="All Technicians" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Technicians</SelectItem>
          {uniqueTechnicians.map((tech) => (
            <SelectItem key={tech} value={tech}>
              {tech}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
