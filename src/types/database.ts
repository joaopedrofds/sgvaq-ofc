export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      cobrancas_sgvaq: {
        Row: {
          comprovante_pagamento_url: string | null
          confirmado_em: string | null
          confirmado_por: string | null
          created_at: string
          id: string
          mes_referencia: string
          pdf_url: string | null
          status: string
          tenant_id: string
          total_vendas: number
          valor_devido: number
        }
        Insert: {
          comprovante_pagamento_url?: string | null
          confirmado_em?: string | null
          confirmado_por?: string | null
          created_at?: string
          id?: string
          mes_referencia: string
          pdf_url?: string | null
          status?: string
          tenant_id: string
          total_vendas?: number
          valor_devido?: number
        }
        Update: {
          comprovante_pagamento_url?: string | null
          confirmado_em?: string | null
          confirmado_por?: string | null
          created_at?: string
          id?: string
          mes_referencia?: string
          pdf_url?: string | null
          status?: string
          tenant_id?: string
          total_vendas?: number
          valor_devido?: number
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_sgvaq_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      competidores: {
        Row: {
          cidade: string | null
          cpf: string
          created_at: string
          estado: string | null
          foto_url: string | null
          id: string
          lgpd_aceite_em: string | null
          nome: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          cidade?: string | null
          cpf: string
          created_at?: string
          estado?: string | null
          foto_url?: string | null
          id?: string
          lgpd_aceite_em?: string | null
          nome: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          cidade?: string | null
          cpf?: string
          created_at?: string
          estado?: string | null
          foto_url?: string | null
          id?: string
          lgpd_aceite_em?: string | null
          nome?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      criterios_pontuacao: {
        Row: {
          descricao: string | null
          id: string
          nome_criterio: string
          ordem: number
          peso: number
          tipo_prova: string
          valor_maximo: number
          valor_minimo: number
        }
        Insert: {
          descricao?: string | null
          id?: string
          nome_criterio: string
          ordem?: number
          peso?: number
          tipo_prova: string
          valor_maximo?: number
          valor_minimo?: number
        }
        Update: {
          descricao?: string | null
          id?: string
          nome_criterio?: string
          ordem?: number
          peso?: number
          tipo_prova?: string
          valor_maximo?: number
          valor_minimo?: number
        }
        Relationships: []
      }
      eventos: {
        Row: {
          banner_url: string | null
          cidade: string | null
          created_at: string
          data_fim: string
          data_inicio: string
          estado: string | null
          id: string
          local: string | null
          nome: string
          regulamento_url: string | null
          status: string
          tenant_id: string
          tipo: string
        }
        Insert: {
          banner_url?: string | null
          cidade?: string | null
          created_at?: string
          data_fim: string
          data_inicio: string
          estado?: string | null
          id?: string
          local?: string | null
          nome: string
          regulamento_url?: string | null
          status?: string
          tenant_id: string
          tipo: string
        }
        Update: {
          banner_url?: string | null
          cidade?: string | null
          created_at?: string
          data_fim?: string
          data_inicio?: string
          estado?: string | null
          id?: string
          local?: string | null
          nome?: string
          regulamento_url?: string | null
          status?: string
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fila_entrada: {
        Row: {
          hora_ausencia: string | null
          hora_chamada: string | null
          hora_entrada: string | null
          id: string
          modalidade_id: string
          ordem_atual: number
          posicao: number
          senha_id: string
          status: string
        }
        Insert: {
          hora_ausencia?: string | null
          hora_chamada?: string | null
          hora_entrada?: string | null
          id?: string
          modalidade_id: string
          ordem_atual: number
          posicao: number
          senha_id: string
          status?: string
        }
        Update: {
          hora_ausencia?: string | null
          hora_chamada?: string | null
          hora_entrada?: string | null
          id?: string
          modalidade_id?: string
          ordem_atual?: number
          posicao?: number
          senha_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fila_entrada_modalidade_id_fkey"
            columns: ["modalidade_id"]
            isOneToOne: false
            referencedRelation: "modalidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fila_entrada_senha_id_fkey"
            columns: ["senha_id"]
            isOneToOne: false
            referencedRelation: "senhas"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_transacoes: {
        Row: {
          canal: string
          created_at: string
          id: string
          senha_id: string | null
          tenant_id: string
          tipo: string
          user_id: string | null
          valor: number
        }
        Insert: {
          canal: string
          created_at?: string
          id?: string
          senha_id?: string | null
          tenant_id: string
          tipo: string
          user_id?: string | null
          valor: number
        }
        Update: {
          canal?: string
          created_at?: string
          id?: string
          senha_id?: string | null
          tenant_id?: string
          tipo?: string
          user_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_transacoes_senha_id_fkey"
            columns: ["senha_id"]
            isOneToOne: false
            referencedRelation: "senhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_transacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      modalidade_criterios: {
        Row: {
          criterio_id: string
          id: string
          modalidade_id: string
          peso_override: number | null
        }
        Insert: {
          criterio_id: string
          id?: string
          modalidade_id: string
          peso_override?: number | null
        }
        Update: {
          criterio_id?: string
          id?: string
          modalidade_id?: string
          peso_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "modalidade_criterios_criterio_id_fkey"
            columns: ["criterio_id"]
            isOneToOne: false
            referencedRelation: "criterios_pontuacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modalidade_criterios_modalidade_id_fkey"
            columns: ["modalidade_id"]
            isOneToOne: false
            referencedRelation: "modalidades"
            referencedColumns: ["id"]
          },
        ]
      }
      modalidades: {
        Row: {
          checkin_aberto: boolean
          evento_id: string
          id: string
          nome: string
          premiacao_descricao: string | null
          senhas_vendidas: number
          total_senhas: number
          valor_senha: number
        }
        Insert: {
          checkin_aberto?: boolean
          evento_id: string
          id?: string
          nome: string
          premiacao_descricao?: string | null
          senhas_vendidas?: number
          total_senhas: number
          valor_senha?: number
        }
        Update: {
          checkin_aberto?: boolean
          evento_id?: string
          id?: string
          nome?: string
          premiacao_descricao?: string | null
          senhas_vendidas?: number
          total_senhas?: number
          valor_senha?: number
        }
        Relationships: [
          {
            foreignKeyName: "modalidades_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_fila: {
        Row: {
          competidor_id: string
          created_at: string
          erro_detalhe: string | null
          id: string
          idempotency_key: string
          mensagem: string
          status: string
          tentativas: number
          tipo: string
        }
        Insert: {
          competidor_id: string
          created_at?: string
          erro_detalhe?: string | null
          id?: string
          idempotency_key: string
          mensagem: string
          status?: string
          tentativas?: number
          tipo: string
        }
        Update: {
          competidor_id?: string
          created_at?: string
          erro_detalhe?: string | null
          id?: string
          idempotency_key?: string
          mensagem?: string
          status?: string
          tentativas?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_fila_competidor_id_fkey"
            columns: ["competidor_id"]
            isOneToOne: false
            referencedRelation: "competidores"
            referencedColumns: ["id"]
          },
        ]
      }
      passadas: {
        Row: {
          created_at_local: string
          criado_em: string
          detalhes_json: Json
          id: string
          juiz_id: string
          modalidade_id: string
          numero_passada: number
          origem: string
          penalidade: number
          penalidade_motivo: string | null
          pontuacao_total: number
          senha_id: string
          sincronizado: boolean
          substituido_por: string | null
          uuid_local: string
        }
        Insert: {
          created_at_local: string
          criado_em?: string
          detalhes_json?: Json
          id?: string
          juiz_id: string
          modalidade_id: string
          numero_passada: number
          origem?: string
          penalidade?: number
          penalidade_motivo?: string | null
          pontuacao_total?: number
          senha_id: string
          sincronizado?: boolean
          substituido_por?: string | null
          uuid_local: string
        }
        Update: {
          created_at_local?: string
          criado_em?: string
          detalhes_json?: Json
          id?: string
          juiz_id?: string
          modalidade_id?: string
          numero_passada?: number
          origem?: string
          penalidade?: number
          penalidade_motivo?: string | null
          pontuacao_total?: number
          senha_id?: string
          sincronizado?: boolean
          substituido_por?: string | null
          uuid_local?: string
        }
        Relationships: [
          {
            foreignKeyName: "passadas_juiz_id_fkey"
            columns: ["juiz_id"]
            isOneToOne: false
            referencedRelation: "tenant_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passadas_modalidade_id_fkey"
            columns: ["modalidade_id"]
            isOneToOne: false
            referencedRelation: "modalidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passadas_senha_id_fkey"
            columns: ["senha_id"]
            isOneToOne: false
            referencedRelation: "senhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passadas_substituido_por_fkey"
            columns: ["substituido_por"]
            isOneToOne: false
            referencedRelation: "passadas"
            referencedColumns: ["id"]
          },
        ]
      }
      passadas_conflitos: {
        Row: {
          created_at: string
          dados_conflito: Json
          id: string
          passada_original_id: string
          resolvido: boolean
          resolvido_em: string | null
          resolvido_por: string | null
        }
        Insert: {
          created_at?: string
          dados_conflito: Json
          id?: string
          passada_original_id: string
          resolvido?: boolean
          resolvido_em?: string | null
          resolvido_por?: string | null
        }
        Update: {
          created_at?: string
          dados_conflito?: Json
          id?: string
          passada_original_id?: string
          resolvido?: boolean
          resolvido_em?: string | null
          resolvido_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "passadas_conflitos_passada_original_id_fkey"
            columns: ["passada_original_id"]
            isOneToOne: false
            referencedRelation: "passadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passadas_conflitos_resolvido_por_fkey"
            columns: ["resolvido_por"]
            isOneToOne: false
            referencedRelation: "tenant_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking: {
        Row: {
          competidor_id: string
          id: string
          modalidade_id: string
          posicao: number | null
          senha_id: string
          total_passadas: number
          total_pontos: number
          updated_at: string
        }
        Insert: {
          competidor_id: string
          id?: string
          modalidade_id: string
          posicao?: number | null
          senha_id: string
          total_passadas?: number
          total_pontos?: number
          updated_at?: string
        }
        Update: {
          competidor_id?: string
          id?: string
          modalidade_id?: string
          posicao?: number | null
          senha_id?: string
          total_passadas?: number
          total_pontos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ranking_competidor_id_fkey"
            columns: ["competidor_id"]
            isOneToOne: false
            referencedRelation: "competidores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_modalidade_id_fkey"
            columns: ["modalidade_id"]
            isOneToOne: false
            referencedRelation: "modalidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_senha_id_fkey"
            columns: ["senha_id"]
            isOneToOne: false
            referencedRelation: "senhas"
            referencedColumns: ["id"]
          },
        ]
      }
      senhas: {
        Row: {
          canal: string
          cancelado_em: string | null
          cancelado_por: string | null
          competidor_id: string
          comprovante_rejeicao_motivo: string | null
          comprovante_status: string | null
          comprovante_url: string | null
          created_at: string
          id: string
          modalidade_id: string
          numero_senha: number
          status: string
          valor_pago: number
          vendido_por: string | null
        }
        Insert: {
          canal: string
          cancelado_em?: string | null
          cancelado_por?: string | null
          competidor_id: string
          comprovante_rejeicao_motivo?: string | null
          comprovante_status?: string | null
          comprovante_url?: string | null
          created_at?: string
          id?: string
          modalidade_id: string
          numero_senha: number
          status?: string
          valor_pago?: number
          vendido_por?: string | null
        }
        Update: {
          canal?: string
          cancelado_em?: string | null
          cancelado_por?: string | null
          competidor_id?: string
          comprovante_rejeicao_motivo?: string | null
          comprovante_status?: string | null
          comprovante_url?: string | null
          created_at?: string
          id?: string
          modalidade_id?: string
          numero_senha?: number
          status?: string
          valor_pago?: number
          vendido_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "senhas_cancelado_por_fkey"
            columns: ["cancelado_por"]
            isOneToOne: false
            referencedRelation: "tenant_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "senhas_competidor_id_fkey"
            columns: ["competidor_id"]
            isOneToOne: false
            referencedRelation: "competidores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "senhas_modalidade_id_fkey"
            columns: ["modalidade_id"]
            isOneToOne: false
            referencedRelation: "modalidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "senhas_vendido_por_fkey"
            columns: ["vendido_por"]
            isOneToOne: false
            referencedRelation: "tenant_users"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          id: string
          nome: string
          role: string
          tenant_id: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          id?: string
          nome: string
          role: string
          tenant_id: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          id?: string
          nome?: string
          role?: string
          tenant_id?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          logo_url: string | null
          nome: string
          plano: string
          slug: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          nome: string
          plano?: string
          slug: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          nome?: string
          plano?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_fila_posicao: {
        Args: { p_modalidade_id: string; p_senha_id: string }
        Returns: undefined
      }
      check_plan_limit: {
        Args: { p_resource: string; p_tenant_id: string }
        Returns: boolean
      }
      decrement_senhas_vendidas: {
        Args: { p_modalidade_id: string }
        Returns: undefined
      }
      get_my_role: { Args: never; Returns: string }
      get_my_tenant_id: { Args: never; Returns: string }
      increment_senhas_vendidas: {
        Args: { p_modalidade_id: string }
        Returns: undefined
      }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

