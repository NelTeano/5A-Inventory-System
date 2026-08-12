"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ComboboxProduct {
  id: string;
  name: string;
  sku: string;
  price: number | string;
  quantity: number | string;
}

interface ProductSearchComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  products: ComboboxProduct[];
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
}

/**
 * Searchable product selector for the order dialog.
 * Lets users search products by SKU or product name.
 */
export function ProductSearchCombobox({
  value,
  onValueChange,
  products,
  placeholder = "Select Product",
  disabled = false,
  emptyMessage,
}: ProductSearchComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedProduct = products.find((product) => product.id === value);

  // Reset the search query whenever the popover is opened
  React.useEffect(() => {
    if (open) {
      setSearch("");
    }
  }, [open]);

  const filteredProducts = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query),
    );
  }, [products, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-between border-violet-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-white shadow-[0_10px_30px_rgba(139,92,246,0.15)] hover:bg-white/15 dark:hover:bg-white/10 hover:border-violet-400 focus:border-violet-400 focus:ring-violet-500/50 font-normal",
            !selectedProduct && "text-white/40",
          )}
        >
          {selectedProduct
            ? `${selectedProduct.sku} - ${selectedProduct.name} - ₱${Number(
                selectedProduct.price,
              ).toFixed(2)} (Stock: ${selectedProduct.quantity})`
            : placeholder}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-max min-w-[28rem] border-violet-400/20 dark:border-white/10 bg-white/90 dark:bg-popover/95 backdrop-blur-sm shadow-[0_10px_30px_rgba(139,92,246,0.15)] [&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-gray-300/50 [&_[cmdk-input-wrapper]]:dark:border-white/10 [&_[cmdk-input-wrapper]]:bg-white/10 [&_[cmdk-input-wrapper]]:dark:bg-white/5 [&_[cmdk-input-wrapper]]:backdrop-blur-sm"
        sideOffset={5}
        align="start"
      >
        <Command className="p-1 bg-transparent" shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search by SKU or product name..."
            className="bg-transparent border-0 focus:ring-0 focus:outline-none text-gray-900 dark:text-white/80 placeholder:text-gray-500 dark:placeholder:text-white/40"
          />
          <CommandList>
            <CommandEmpty className="text-gray-600 dark:text-white/60 text-sm text-center p-5">
              {emptyMessage ?? "No product found."}
            </CommandEmpty>
            <CommandGroup>
              {filteredProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.id}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                  className="cursor-pointer text-gray-900 dark:text-white/80 focus:bg-violet-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === product.id
                        ? "opacity-100 text-violet-500 dark:text-violet-400"
                        : "opacity-0",
                    )}
                  />
                  <span className="flex-1 whitespace-nowrap">
                    {product.sku} - {product.name} - ₱
                    {Number(product.price).toFixed(2)} (Stock:{" "}
                    {product.quantity})
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
