import { getDBConnection } from '../database';

export interface Post {
    id: number;
    content: string | null;
    images: string[];
    status: 'draft' | 'posted';
    platforms: string | null;
    created_at: string;
    tags: string | null;
}

// Omit<> é um utilitário do TypeScript para criar um tipo omitindo certas chaves.
// Usado para o método 'create', já que 'id' e 'created_at' são gerados pelo banco.
type PostCreateData = Omit<Post, 'id' | 'created_at'>;

class PostDao {
    /**
     * Busca todos os posts do banco de dados, ordenados por data de criação decrescente.
     * @returns {Promise<Post[]>} Uma lista de posts.
     */
    public async getAll(): Promise<Post[]> {
        const db = await getDBConnection();
        try {
            const results = await db.executeSql(
                'SELECT id, content, images, status, platforms, created_at, tags FROM posts ORDER BY created_at DESC'
            );

            const posts: Post[] = [];
            results.forEach(result => {
                for (let i = 0; i < result.rows.length; i++) {
                    const row = result.rows.item(i);
                    posts.push({
                        ...row,
                        images: JSON.parse(row.images || '[]'),
                    });
                }
            });
            return posts;
        } catch (error) {
            console.error('Erro ao buscar todos os posts [DAO]:', error);
            throw error;
        }
    }

    /**
     * Insere um novo post ou rascunho no banco de dados.
     * @param {PostCreateData} postData - Os dados do post a serem criados.
     */
    public async create(postData: Partial<PostCreateData>): Promise<void> {
        const {
            content = '',
            images = [],
            status = 'draft',
            platforms = '',
            tags = '',
        } = postData;

        const imagesJson = JSON.stringify(images);
        const db = await getDBConnection();

        try {
            await db.executeSql(
                'INSERT INTO posts (content, images, status, platforms, tags) VALUES (?, ?, ?, ?, ?)',
                [content, imagesJson, status, platforms, tags]
            );
            console.log('Post criado com sucesso [DAO]');
        } catch (error) {
            console.error('Erro ao criar post [DAO]:', error);
            throw error;
        }
    }

    /**
     * Busca sugestões de tags com base em uma query.
     * @param {string} query - O texto sendo digitado pelo usuário.
     * @returns {Promise<string[]>} Uma lista de tags únicas que correspondem à busca.
     */
    public async getTagSuggestions(query: string): Promise<string[]> {
        if (!query.trim())
            return [];
        
        const db = await getDBConnection();
        try {
            const results = await db.executeSql(
                "SELECT DISTINCT tags FROM posts WHERE tags LIKE ?",
                [`%${query}%`]
            );

            const uniqueTags = new Set<string>();
            results.forEach(result => {
                for (let i = 0; i < result.rows.length; i++) {
                    result.rows.item(i).tags.split(',')
                        .map((tag: string) => tag.trim())
                        .filter((tag: string) => tag.toLowerCase().includes(query.toLowerCase()))
                        .forEach((tag: string) => uniqueTags.add(tag));
                }
            });
            return Array.from(uniqueTags);
        } catch (error) {
            console.error("Erro ao buscar sugestões de tags [DAO]:", error);
            throw error;
        }
    }
}

export default new PostDao();