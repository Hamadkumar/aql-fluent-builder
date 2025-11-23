import { AQLBuilder } from '../core/aql.builder';
import { TestSchema } from '../schema/test-schema';

describe('Edge Safety', () => {
    it('should allow valid edge collection in inEdge', () => {
        const query = new AQLBuilder<TestSchema>()
            .for('e')
            .inEdge('user_posts') // OK: user_posts is an EdgeSchema
            .return('e')
            .toAql();

        expect(query).toBe('FOR e IN user_posts\nRETURN e');
    });

    // it('should not allow invalid collection', () => {
    //     expect(() => {
    //         new AQLBuilder<TestSchema>()
    //             .for('u')
    //             .in('invalid_collection');
    //     }).toThrow();
    // });

    // it('should not allow document collection in inEdge', () => {
    //     expect(() => {
    //         new AQLBuilder<TestSchema>()
    //             .for('u')
    //             .inEdge('users');
    //     }).toThrow();
    // });

    // it('should not allow non-existent collection in inEdge', () => {
    //     expect(() => {
    //         new AQLBuilder<TestSchema>()
    //             .for('x')
    //             .inEdge('invalid_edge');
    //     }).toThrow();
    // });
});
