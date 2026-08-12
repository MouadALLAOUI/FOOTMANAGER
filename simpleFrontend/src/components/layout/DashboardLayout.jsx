import React from 'react'
import Shell from '../../components/dashboard/Shell'
import { Outlet } from 'react-router-dom'

export default function DashboardLayout({ items, brand, roleLabel }) {
  return (
    <Shell items={items} brand={brand} roleLabel={roleLabel}>
      <Outlet />
    </Shell>
  )
}
