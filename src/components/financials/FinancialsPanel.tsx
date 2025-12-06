"use client"

import React, { useState, useRef, useLayoutEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"


const SUMMARY = "Financials Dashboard Summary"
const SHEKAR = "Financials Dashboard Shekar"
const KENNITH = "Financials Dashboard Kennith"
const PERCY = "Financials Dashboard Percy"

const chartConfig = {
  Complete: { label: "Complete", color: "#56A05E" },
  Cancelled: { label: "Cancelled", color: "#C9B6AA" },
  Created: { label: "Created", color: "#6EA6E6" },
  OffLoad: { label: "Complete Off Load", color: "#C84A56" },
}

const summaryData = [
  { status: "Complete", value: 18000000 },
  { status: "Cancelled", value: 3000000 },
  { status: "Created", value: 25000 },
  { status: "Complete Off Load", value: 45000 },
]

// Sample vehicle-series data for score card (trimmed for readability)
const scoreCardData = [
  { vehicle: "JK68DFGP", a: 1000000, b: 800000, c: 600000 },
  { vehicle: "HY22SFGP", a: 1100000, b: 700000, c: 900000 },
  { vehicle: "JL65HGP", a: 900000, b: 400000, c: 300000 },
  { vehicle: "JL65GHP", a: 600000, b: 200000, c: 100000 },
  { vehicle: "HY74WGP", a: 1200000, b: 400000, c: 200000 },
]


export default function FinancialsPanel() {
  const items = [SUMMARY, SHEKAR, KENNITH, PERCY]
  const [selected, setSelected] = useState(SUMMARY)

  return (
    <div className="w-full space-y-2">
      {items.map((item) => (
        <div key={item} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setSelected(selected === item ? "" : item)}
            className={cn(
              "w-full px-6 py-4 text-left font-medium transition-colors duration-200 flex justify-between items-center",
              selected === item
                ? "bg-primary text-white"
                : "bg-white hover:bg-gray-50"
            )}
          >
            {item}
            <svg
              className={cn(
                "w-5 h-5 transition-transform duration-200",
                selected === item ? "rotate-180" : ""
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <div className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden",
            selected === item ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
          )}>
            <div className="p-6 bg-gray-50 max-h-96 overflow-y-auto">
              {item === SUMMARY && (
                <>
                  <Card className="mb-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">NUMBER OF TRIPS (COST)</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <ChartContainer
                        config={{
                          Complete: { color: chartConfig.Complete.color },
                          Cancelled: { color: chartConfig.Cancelled.color },
                          Created: { color: chartConfig.Created.color },
                          OffLoad: { color: chartConfig.OffLoad.color },
                        }}
                        className="h-[300px]"
                      >
                        <BarChart data={summaryData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="status" />
                          <YAxis />
                          <Tooltip content={<ChartTooltipContent hideLabel />} />
                          <Bar dataKey="value" fill={chartConfig.Complete.color} />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">SCORE CARD</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <ChartContainer config={{ a: { color: "#6EA6E6" }, b: { color: "#56A05E" }, c: { color: "#C84A56" } }} className="h-[350px]">
                        <BarChart data={scoreCardData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="vehicle" angle={-45} textAnchor="end" height={60} />
                          <YAxis />
                          <Tooltip content={<ChartTooltipContent hideLabel />} />
                          <Bar dataKey="a" fill="#6EA6E6" />
                          <Bar dataKey="b" fill="#56A05E" />
                          <Bar dataKey="c" fill="#C84A56" />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </>
              )}
              {item === SHEKAR && (
                <>
                  <Card className="mb-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">SHEKAR - SCORE & TRENDS</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <ChartContainer config={{ a: { color: "#6EA6E6" }, b: { color: "#56A05E" } }} className="h-[350px]">
                        <BarChart data={scoreCardData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="vehicle" angle={-45} textAnchor="end" height={60} />
                          <YAxis />
                          <Tooltip content={<ChartTooltipContent hideLabel />} />
                          <Bar dataKey="a" fill="#6EA6E6" />
                          <Bar dataKey="b" fill="#56A05E" />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">SHEKAR - ADDITIONAL METRIC</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <ChartContainer config={{ a: { color: "#6EA6E6" } }} className="h-[250px]">
                        <BarChart data={scoreCardData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="vehicle" type="category" width={80} />
                          <Tooltip content={<ChartTooltipContent hideLabel />} />
                          <Bar dataKey="a" fill="#6EA6E6" />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </>
              )}
              {item === KENNITH && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold">KENNITH - TRIPS COST</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <ChartContainer
                      config={{
                        Complete: { color: chartConfig.Complete.color },
                        Cancelled: { color: chartConfig.Cancelled.color },
                      }}
                      className="h-[300px]"
                    >
                      <BarChart data={summaryData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="status" />
                        <YAxis />
                        <Tooltip content={<ChartTooltipContent hideLabel />} />
                        <Bar dataKey="value" fill={chartConfig.Complete.color} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
              {item === PERCY && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold">PERCY - DASHBOARD</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <ChartContainer config={{ a: { color: "#6EA6E6" } }} className="h-[350px]">
                      <BarChart data={scoreCardData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="vehicle" angle={-45} textAnchor="end" height={60} />
                        <YAxis />
                        <Tooltip content={<ChartTooltipContent hideLabel />} />
                        <Bar dataKey="a" fill="#6EA6E6" />
                        <Bar dataKey="b" fill="#56A05E" />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}